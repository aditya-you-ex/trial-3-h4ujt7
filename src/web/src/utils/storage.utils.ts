/* -----------------------------------------------------------------------------
 * TaskStream AI - Local Storage Utilities
 * -----------------------------------------------------------------------------
 * This module provides a series of utility functions to manage browser
 * localStorage operations with production-grade robustness, including:
 *   - AES-256 encryption for sensitive data storage
 *   - Optional data compression for large payloads
 *   - Integrity verification through hash checks
 *   - Automatic retry mechanisms and quota handling
 *   - Secure cleanup and selective data preservation
 *
 * References to Technical Specifications:
 *   - Data Security (7.2.1 Encryption Standards): Ensures AES-256 encryption
 *     at rest in localStorage, with data integrity checks and thorough audits.
 *   - Authentication Flow (7.1.1 Authentication Flow): Supports secure token
 *     storage management for authentication states with encryption and
 *     automatic cleanup on removal/clear.
 *
 * Usage:
 *   import {
 *     setLocalStorage,
 *     getLocalStorage,
 *     removeLocalStorage,
 *     clearLocalStorage
 *   } from './storage.utils';
 *
 *   await setLocalStorage('myKey', { foo: 'bar' }, true, true);
 *   const data = await getLocalStorage<{ foo: string }>('myKey', true);
 *
 * Notes:
 *   - The SECRET_ENCRYPTION_KEY here is a placeholder. In a real
 *     production environment, it should be managed via environment
 *     variables or a secure secret manager.
 *   - This file is highly commented for clarity and enterprise readiness.
 *     It outlines thorough error handling, logging, and data security
 *     considerations throughout each function.
 * -----------------------------------------------------------------------------
 */

/* IE1: Internal Import (Type) -------------------------------------------------
 * We import the LoadingState type from our internal module to demonstrate
 * that we can manage and reference a "failed" state if needed for error
 * logging or expansions in the future. Here, we specifically ensure that
 * we can reference 'failed' as a fallback or to set an optional status.
 */
import { LoadingState } from '../types/common.types';

/* IE2: External Library Imports (with versions) -------------------------------
 * We rely on the 'crypto-js' library (version ^4.1.1) for AES-256 encryption
 * and UTF-8 encoding, and 'pako' (version ^2.1.0) for compressing/decompressing
 * large data strings.
 */
import AES from 'crypto-js/aes' /* ^4.1.1 */;
import encUtf8 from 'crypto-js/enc-utf8' /* ^4.1.1 */;
import SHA256 from 'crypto-js/sha256' /* ^4.1.1 */;
import * as zlib from 'pako' /* ^2.1.0 */;

/**
 * A secret key used for AES-256 encryption. In a production system, this
 * should be stored securely (e.g., environment variable, vault) rather
 * than hard-coded in source control.
 */
const SECRET_ENCRYPTION_KEY = 'CHANGE_THIS_TO_A_SECURE_KEY';

/**
 * Attempts to determine if localStorage is both available and writable.
 * This function performs a quick write-test to ensure localStorage
 * operations are permitted. Throws an error if not available.
 */
function checkLocalStorageAvailability(): void {
  try {
    const testKey = '__test_localStorage_availability__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
  } catch (err) {
    throw new Error('LocalStorage is not available or writable in this environment.');
  }
}

/**
 * Attempts to store a given item in localStorage and gracefully
 * handles quota exceed errors by removing older items or clearing
 * space if needed. Retries the operation up to a fixed number of times
 * before finally throwing an error.
 */
function safeSetItem(key: string, data: string): void {
  const maxRetries = 3;
  let attemptCount = 0;
  let operationState: LoadingState = 'idle';

  while (attemptCount < maxRetries) {
    try {
      window.localStorage.setItem(key, data);
      // If successful, break out of the loop
      operationState = 'succeeded';
      break;
    } catch (error: any) {
      attemptCount += 1;
      operationState = 'failed';
      // If it's a quota error, attempt to free space:
      if (
        error &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        // Simple approach: remove the oldest item or clear everything
        // for demonstration. In production, a more sophisticated
        // cleanup strategy might be needed.
        const firstKey = window.localStorage.key(0);
        if (firstKey) {
          window.localStorage.removeItem(firstKey);
        } else {
          window.localStorage.clear();
        }
      } else {
        // Non-quota error, rethrow
        throw new Error(
          `Failed to set localStorage item '${key}' on attempt ${attemptCount}: ${error?.message}`
        );
      }
    }
  }

  if (operationState === 'failed') {
    throw new Error(
      `Exceeded maximum attempts to store item '${key}' in localStorage.`
    );
  }
}

/**
 * Generates an integrity hash using SHA-256. The hash includes
 * all relevant transformed data. This hash can be used later
 * to verify that data was not modified outside of the application.
 */
function generateIntegrityHash(str: string): string {
  return SHA256(str).toString();
}

/**
 * Securely overwrites data in localStorage (by writing random
 * data of the same length) before removal to minimize the chances
 * of data remnants persisting in storage. This is not a guaranteed
 * security measure, but it adds a layer of difficulty for potential
 * malicious retrieval of stale data.
 */
function secureOverwrite(key: string, length: number): void {
  if (length <= 0) {
    return;
  }
  const garbage = Array(length).fill('0').join('');
  safeSetItem(key, garbage);
}

/**
 * setLocalStorage
 * ----------------------------------------------------------------------------
 * Stores a value in localStorage with optional compression, AES-256 encryption,
 * and integrity checks. This operation includes error handling, automatic
 * retry on quota issues, and logging.
 *
 * @template T - The type of the value being stored.
 * @param {string} key - The storage key under which data will be stored.
 * @param {T} value - The actual data object to store.
 * @param {boolean} encrypt - Whether to apply AES-256 encryption.
 * @param {boolean} compress - Whether to apply compression for large data.
 * @returns {Promise<void>} - Resolves when the storage operation completes.
 */
export async function setLocalStorage<T>(
  key: string,
  value: T,
  encrypt: boolean,
  compress: boolean
): Promise<void> {
  try {
    // 1) Validate key parameter and storage availability
    if (!key) {
      throw new Error('Invalid storage key. Key must be a non-empty string.');
    }
    checkLocalStorageAvailability();

    // 2) Check storage quota and cleanup if needed
    //    (This is automated within safeSetItem through retries.)

    // 3) Compress data if compress flag is true
    let stringified: string = JSON.stringify(value);
    if (compress) {
      const deflatedData = zlib.deflate(stringified, { level: 9 });
      // Convert compressed data to base64 for encryption/storage
      stringified = window.btoa(String.fromCharCode(...deflatedData));
    }

    // 4) Encrypt value if encrypt flag is true using AES-256
    let finalString: string = stringified;
    if (encrypt) {
      const encrypted = AES.encrypt(stringified, SECRET_ENCRYPTION_KEY);
      finalString = encrypted.toString();
    }

    // 5) Generate and attach integrity hash
    const dataHash = generateIntegrityHash(finalString);

    // 6) Store value with metadata in localStorage
    const wrapped = JSON.stringify({
      data: finalString,
      hash: dataHash,
      meta: {
        encrypted: encrypt,
        compressed: compress,
        timestamp: new Date().toISOString(),
      },
    });

    safeSetItem(key, wrapped);

    // 7) Log storage operation for audit
    // In a production system, consider using a monitoring or audit service
    // instead of console.log for more robust logging capabilities.
    console.log(
      `[setLocalStorage] Successfully stored item under key '${key}' with encryption=${encrypt}, compression=${compress}.`
    );
  } catch (error: any) {
    // 8) Handle errors with automatic retry mechanism is built into safeSetItem.
    // For any other error, we capture here and optionally set a "failed" state.
    const operationState: LoadingState = 'failed';
    console.error(
      `[setLocalStorage] Error storing item '${key}'. State: ${operationState}, Details:`,
      error
    );
    throw error;
  }
}

/**
 * getLocalStorage
 * ----------------------------------------------------------------------------
 * Retrieves and validates a value from localStorage, including optional
 * decryption, decompression, integrity hash checks, and error handling.
 *
 * @template T - The expected type of the stored value.
 * @param {string} key - The storage key from which data will be retrieved.
 * @param {boolean} decrypt - Whether to decrypt the retrieved data using AES-256.
 * @returns {Promise<T | null>} - The typed data object or null if not found.
 */
export async function getLocalStorage<T>(
  key: string,
  decrypt: boolean
): Promise<T | null> {
  try {
    // 1) Validate key and check storage availability
    if (!key) {
      throw new Error('Invalid storage key. Key must be a non-empty string.');
    }
    checkLocalStorageAvailability();

    // 2) Retrieve value and metadata from localStorage
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue);
    if (!parsed || !parsed.data || !parsed.hash) {
      console.warn(
        `[getLocalStorage] Key '${key}' found, but the structure is invalid or missing fields.`
      );
      return null;
    }

    const { data, hash, meta } = parsed;

    // 3) Verify data integrity using stored hash
    const calculatedHash = generateIntegrityHash(data);
    if (calculatedHash !== hash) {
      console.error(
        `[getLocalStorage] Integrity check failed for key '${key}'. Data may have been tampered with.`
      );
      return null;
    }

    // 4) Decrypt value if encrypted using AES-256
    let intermediate = data as string;
    if (meta.encrypted && decrypt) {
      const bytes = AES.decrypt(intermediate, SECRET_ENCRYPTION_KEY);
      intermediate = bytes.toString(encUtf8);
    }

    // 5) Decompress value if compressed
    if (meta.compressed) {
      // Data was base64-encoded after compression
      const raw = window.atob(intermediate);
      const charData = raw.split('').map((c) => c.charCodeAt(0));
      const inflated = zlib.inflate(new Uint8Array(charData));
      intermediate = new TextDecoder().decode(inflated);
    }

    // 6) Parse and type-check the value
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(intermediate);
    } catch (parseErr) {
      console.error(
        `[getLocalStorage] Failed to parse JSON data after decompression/decryption for key '${key}'.`
      );
      return null;
    }

    // 7) Log access for audit purposes
    console.log(
      `[getLocalStorage] Successfully retrieved item under key '${key}'.`
    );

    // 8) Return processed value or null
    return parsedValue as T;
  } catch (error: any) {
    const operationState: LoadingState = 'failed';
    console.error(
      `[getLocalStorage] Error retrieving item '${key}'. State: ${operationState}, Details:`,
      error
    );
    return null;
  }
}

/**
 * removeLocalStorage
 * ----------------------------------------------------------------------------
 * Securely removes an item from localStorage by overwriting it with
 * garbage data first (optional best-effort approach) and then clearing
 * it from storage. Also performs logging and basic error handling.
 *
 * @param {string} key - The key of the item to remove from localStorage.
 * @returns {Promise<void>} - A promise that resolves when the removal completes.
 */
export async function removeLocalStorage(key: string): Promise<void> {
  try {
    // 1) Validate key and check item existence
    if (!key) {
      throw new Error('Invalid storage key. Key must be a non-empty string.');
    }
    checkLocalStorageAvailability();
    const existingValue = window.localStorage.getItem(key);
    if (!existingValue) {
      console.warn(`[removeLocalStorage] No item found under key '${key}'.`);
      return;
    }

    // 2) Securely overwrite data before removal
    //    For demonstration, we attempt to approximate the length
    //    of the storedValue for overwriting. This is not guaranteed
    //    to cover all underlying physical storage intricacies.
    secureOverwrite(key, existingValue.length);

    // 3) Remove item from localStorage
    window.localStorage.removeItem(key);

    // 4) Clean up associated metadata (if any separate metadata store)
    //    In this simplified approach, everything is stored together
    //    under the same key, so there's no separate cleanup needed.

    // 5) Log removal operation
    console.log(`[removeLocalStorage] Successfully removed item under key '${key}'.`);
  } catch (error: any) {
    // 6) Handle removal errors with retry
    //    For simplicity, we do a direct approach here. If repeated
    //    removals or overwrites fail, we log and rethrow. In a production
    //    system, a more robust approach might be set in place.
    const operationState: LoadingState = 'failed';
    console.error(
      `[removeLocalStorage] Error removing item '${key}'. State: ${operationState}, Details:`,
      error
    );
    throw error;
  }
}

/**
 * clearLocalStorage
 * ----------------------------------------------------------------------------
 * Securely clears all items from localStorage while allowing the caller
 * to specify a list of preserveKeys that should not be removed. The items
 * to be removed are first overwritten with meaningless data before
 * full clearance.
 *
 * @param {string[]} preserveKeys - An array of keys that will be preserved
 * in localStorage even after the clear operation.
 * @returns {Promise<void>} - A promise that resolves when all items are cleared.
 */
export async function clearLocalStorage(preserveKeys: string[]): Promise<void> {
  try {
    checkLocalStorageAvailability();

    // 1) Backup essential data specified in preserveKeys
    const backupData: Record<string, string | null> = {};
    preserveKeys.forEach((pKey) => {
      const val = window.localStorage.getItem(pKey);
      backupData[pKey] = val !== null ? val : null;
    });

    // 2) Securely overwrite all data
    //    We'll iterate over localStorage items and attempt a minimal overwrite.
    const totalItems = window.localStorage.length;
    const keysToRemove: string[] = [];
    for (let i = 0; i < totalItems; i++) {
      const thisKey = window.localStorage.key(i);
      if (thisKey && !preserveKeys.includes(thisKey)) {
        const itemValue = window.localStorage.getItem(thisKey);
        if (itemValue) {
          secureOverwrite(thisKey, itemValue.length);
          keysToRemove.push(thisKey);
        }
      }
    }

    // 3) Clear localStorage
    //    We have effectively overwritten all data, but to ensure
    //    we remove them from the key space, do a final remove pass.
    keysToRemove.forEach((removalKey) => {
      window.localStorage.removeItem(removalKey);
    });

    // 4) Restore preserved data
    preserveKeys.forEach((pKey) => {
      const backupVal = backupData[pKey];
      if (backupVal !== null) {
        safeSetItem(pKey, backupVal);
      }
    });

    // 5) Log clear operation
    console.log(
      `[clearLocalStorage] Cleared localStorage except for keys: [${preserveKeys.join(', ')}]`
    );

    // 6) Verify clear completion
    //    Check if the leftover keys match the preserve keys only.
    const finalCheckArray = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) {
        finalCheckArray.push(k);
      }
    }
    const unmatched = finalCheckArray.filter((k) => !preserveKeys.includes(k));
    if (unmatched.length > 0) {
      console.error(
        `[clearLocalStorage] Some items were not cleared: [${unmatched.join(', ')}]`
      );
    }
  } catch (error: any) {
    console.error('[clearLocalStorage] Failed to clear localStorage:', error);
    throw error;
  }
}
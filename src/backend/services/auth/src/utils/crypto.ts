////////////////////////////////////////////////////////////////////////////////
// External Imports with Version Comments
////////////////////////////////////////////////////////////////////////////////
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'; // Node.js built-in
import bcrypt from 'bcryptjs'; // ^2.4.3
import { createLogger, format, transports } from 'winston'; // ^3.8.0

////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////
import { AUTH_CONFIG, security as securityConfig } from '../config';

////////////////////////////////////////////////////////////////////////////////
// Logger Initialization for Secure Logging
////////////////////////////////////////////////////////////////////////////////
/**
 * Winston logger instance for cryptographic operations. 
 * All sensitive data must be masked or omitted from direct logs.
 */
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

////////////////////////////////////////////////////////////////////////////////
// Global Key Rotation Placeholders
// In a production environment, these would likely reside in secure storage
// or a dedicated key management system (AWS KMS, HashiCorp Vault, etc.).
////////////////////////////////////////////////////////////////////////////////
let currentKeyVersion = 1;            // Tracks the current version of the encryption key
let lastRotationTime = Date.now();    // Tracks the last time a key rotation occurred
let inMemoryKey = randomBytes(32);    // A randomly generated 32-byte key for AES-256-GCM

////////////////////////////////////////////////////////////////////////////////
// Helpers & Configuration
////////////////////////////////////////////////////////////////////////////////
const ALGORITHM = securityConfig.encryption.algorithm;        // e.g., "AES-256-GCM"
const IV_LENGTH = securityConfig.encryption.ivLength;         // e.g., 16 bytes
const SALT_ROUNDS = securityConfig.encryption.saltRounds;     // e.g., 12
const MIN_KEY_LENGTH_BITS = securityConfig.encryption.minimumKeyLength; // e.g., 256 bits
const KEY_ROTATION_DAYS = securityConfig.encryption.keyRotationDays;    // e.g., 90 days

// Calculate rotation interval in milliseconds
const ROTATION_INTERVAL_MS = KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000;

////////////////////////////////////////////////////////////////////////////////
// 1. hashPassword
// Generates a secure hash of the provided password using bcrypt with
// configurable salt rounds. Returns a Promise of the hashed password.
////////////////////////////////////////////////////////////////////////////////
/**
 * @param password Plain-text password to be hashed.
 * @returns Promise resolving to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Step 1: Validate password meets minimum security requirement
    // (Example policy: length >= 8; may be extended with complexity checks)
    if (!password || password.length < 8) {
      logger.warn('[hashPassword] Password does not meet minimum security requirements.', {
        event: 'PASSWORD_VALIDATION'
      });
      throw new Error('Password does not meet minimum security requirements.');
    }

    // Step 2: Generate salt using bcrypt with configured salt rounds
    const salt = await bcrypt.genSalt(SALT_ROUNDS);

    // Step 3: Hash the password with the generated salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // Step 4: Log hashing operation with masked data
    logger.info('[hashPassword] Password successfully hashed.', {
      event: 'PASSWORD_HASH',
      masked: '****'
    });

    // Step 5: Return hashed password string
    return hashedPassword;
  } catch (error) {
    logger.error('[hashPassword] Error while hashing password.', {
      event: 'PASSWORD_HASH_ERROR',
      error: error.message
    });
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////////////
// 2. verifyPassword
// Verifies a password against its hash using bcrypt compare with enhanced
// security logging. Returns a Promise of a boolean indicating match success.
////////////////////////////////////////////////////////////////////////////////
/**
 * @param password Plain-text password from user input.
 * @param hash Stored bcrypt hash to compare against.
 * @returns Promise resolving to a boolean indicating if password matches the hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Step 1: Validate input parameters
    if (!password || !hash) {
      logger.warn('[verifyPassword] Missing parameters for verification.', {
        event: 'PASSWORD_VERIFY_PARAM_MISSING'
      });
      return false;
    }

    // Step 2: Compare plain-text password with the stored hash
    const match = await bcrypt.compare(password, hash);

    // Step 3: Log verification attempt with masked data
    logger.info('[verifyPassword] Password verification attempt completed.', {
      event: 'PASSWORD_VERIFY',
      match,
      masked: '****'
    });

    // Step 4: Return the boolean result
    return match;
  } catch (error) {
    logger.error('[verifyPassword] Error while verifying password.', {
      event: 'PASSWORD_VERIFY_ERROR',
      error: error.message
    });
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////////////
// 3. validateKey
// Validates that an encryption key meets the security requirements defined
// for AES-256 encryption, including length and basic format checks.
////////////////////////////////////////////////////////////////////////////////
/**
 * @param key The encryption key (Buffer) to validate.
 * @returns boolean indicating whether the key is valid based on length/entropy checks.
 */
export function validateKey(key: Buffer): boolean {
  try {
    // Step 1: Check key length meets AES-256 requirements
    if (!key || key.length !== 32) {
      logger.warn('[validateKey] Key length is invalid. Must be 32 bytes for AES-256.', {
        event: 'KEY_VALIDATION',
        providedLength: key ? key.length : 0
      });
      return false;
    }

    // Step 2: Verify key entropy (placeholder for real entropy checks)
    // For demonstration, we skip detailed entropy calculations.

    // Step 3: Validate key format (placeholder). Could check for random distribution, etc.

    // Step 4: Log validation result
    logger.info('[validateKey] Encryption key successfully validated.', {
      event: 'KEY_VALIDATION',
      maskedKey: '****'
    });

    return true;
  } catch (error) {
    logger.error('[validateKey] Error during key validation.', {
      event: 'KEY_VALIDATION_ERROR',
      error: error.message
    });
    return false;
  }
}

////////////////////////////////////////////////////////////////////////////////
// 4. rotateKey
// Handles encryption key rotation based on security configuration. Checks if
// the rotation schedule is due, generates a new key if required, updates version
// tracking, logs the event, and returns either the new or current key.
////////////////////////////////////////////////////////////////////////////////
/**
 * @param currentKey The current encryption key in use.
 * @returns Promise resolving to a new encryption key if rotation is due, otherwise returns the current key.
 */
export async function rotateKey(currentKey: Buffer): Promise<Buffer> {
  try {
    // Step 1: Check key rotation schedule
    const now = Date.now();
    const timeSinceLastRotation = now - lastRotationTime;

    if (timeSinceLastRotation >= ROTATION_INTERVAL_MS) {
      // Step 2: Generate a new key if rotation is needed
      const newKey = randomBytes(32);

      // Step 3: Update key metadata (version, last rotation time)
      currentKeyVersion += 1;
      lastRotationTime = now;
      inMemoryKey = newKey;

      // Step 4: Log key rotation event
      logger.info('[rotateKey] Key rotation performed.', {
        event: 'KEY_ROTATION',
        newKeyVersion: currentKeyVersion,
        maskedNewKey: '****'
      });

      // Step 5: Return the new key
      return newKey;
    }

    // If no rotation needed, log it and return the current key
    logger.info('[rotateKey] Key rotation not required at this time.', {
      event: 'KEY_ROTATION_CHECK',
      currentKeyVersion
    });

    return currentKey;
  } catch (error) {
    logger.error('[rotateKey] Error during key rotation.', {
      event: 'KEY_ROTATION_ERROR',
      error: error.message
    });
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////////////
// 5. encrypt
// Encrypts sensitive data using AES-256-GCM with enhanced security features,
// including key validation, rotation checks, and comprehensive logging.
////////////////////////////////////////////////////////////////////////////////
/**
 * @param data Plain-text data to be encrypted.
 * @param key The encryption key to use. Must pass validation for AES-256-GCM.
 * @returns An object containing the ciphertext, IV, authTag, and keyVersion.
 */
export async function encrypt(
  data: string,
  key: Buffer
): Promise<{ ciphertext: string; iv: string; authTag: string; keyVersion: number }> {
  try {
    // Step 1: Validate input data and key
    if (!data) {
      throw new Error('No data provided for encryption.');
    }
    if (!validateKey(key)) {
      throw new Error('Invalid encryption key provided.');
    }

    // Step 2: Check key rotation status (optional usage of rotateKey)
    // In a real scenario, we might call rotateKey() conditionally here
    // to ensure we are always using the newest key if needed.
    // await rotateKey(key);

    // Step 3: Generate random IV for AES-256-GCM
    const iv = randomBytes(IV_LENGTH);

    // Step 4: Create cipher using AES-256-GCM with the validated key and IV
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 });

    // Step 5: Encrypt the data
    const encryptedBuffer = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // Step 6: Retrieve the authentication tag
    const authTag = cipher.getAuthTag();

    // Step 7: Log encryption operation with masked data
    logger.info('[encrypt] Data encryption successful.', {
      event: 'DATA_ENCRYPT',
      maskedData: '****',
      ivLength: iv.length,
      authTagLength: authTag.length
    });

    // Step 8: Return encrypted data object, including keyVersion for reference
    return {
      ciphertext: encryptedBuffer.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: currentKeyVersion
    };
  } catch (error) {
    logger.error('[encrypt] Error occurred during data encryption.', {
      event: 'DATA_ENCRYPT_ERROR',
      error: error.message
    });
    throw error;
  }
}

////////////////////////////////////////////////////////////////////////////////
// 6. decrypt
// Decrypts data encrypted with AES-256-GCM, including support for key versioning.
// This function will verify the integrity of the data using the provided authTag.
////////////////////////////////////////////////////////////////////////////////
/**
 * @param encryptedData Object containing ciphertext, IV, authTag, and keyVersion.
 * @param key The decryption key used for AES-256-GCM.
 * @returns Plain-text data that was originally encrypted.
 */
export async function decrypt(
  encryptedData: { ciphertext: string; iv: string; authTag: string; keyVersion: number },
  key: Buffer
): Promise<string> {
  try {
    // Step 1: Validate encrypted data object
    if (
      !encryptedData ||
      !encryptedData.ciphertext ||
      !encryptedData.iv ||
      !encryptedData.authTag
    ) {
      throw new Error('Encrypted data object is incomplete or invalid.');
    }

    // Step 2: Verify the provided authTag presence
    if (!encryptedData.authTag) {
      throw new Error('Missing authentication tag in encrypted data.');
    }

    // Step 3: Handle key rotation if needed or key version mismatch (placeholder).
    // In a real scenario, we might attempt to fetch the appropriate past key
    // if the keyVersion differs from currentKeyVersion.

    // Step 4: Create decipher for AES-256-GCM
    if (!validateKey(key)) {
      throw new Error('Invalid decryption key provided.');
    }
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encryptedData.iv, 'base64'), {
      authTagLength: 16
    });

    // Step 5: Set authentication tag for data integrity check
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));

    // Decrypt the data
    const decryptedBuffer = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.ciphertext, 'base64')),
      decipher.final()
    ]);

    // Step 6: Log decryption operation with masked data
    logger.info('[decrypt] Data decryption successful.', {
      event: 'DATA_DECRYPT',
      maskedData: '****',
      keyVersionUsed: encryptedData.keyVersion
    });

    // Step 7: Return the decrypted string
    return decryptedBuffer.toString('utf8');
  } catch (error) {
    logger.error('[decrypt] Error occurred during data decryption.', {
      event: 'DATA_DECRYPT_ERROR',
      error: error.message
    });
    throw error;
  }
}
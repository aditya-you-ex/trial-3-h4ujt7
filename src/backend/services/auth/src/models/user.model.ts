////////////////////////////////////////////////////////////////////////////////////////////////////
// Imports & Dependencies
////////////////////////////////////////////////////////////////////////////////////////////////////

// External libraries (with versions)
import {
  Entity, // version ^0.3.17
  Column, // version ^0.3.17
  PrimaryGeneratedColumn, // version ^0.3.17
  BeforeInsert, // version ^0.3.17
  BeforeUpdate, // version ^0.3.17
} from 'typeorm'; // version ^0.3.17

import { hash, compare } from 'bcryptjs'; // version ^2.4.3
import { authenticator } from 'otplib'; // version ^12.0.1
import * as crypto from 'crypto';

// Internal imports
import { IUser, UserRole } from '../../../shared/interfaces/auth.interface';
import { Metadata } from '../../../shared/interfaces/common.interface';

////////////////////////////////////////////////////////////////////////////////////////////////////
// Entity Definition
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Represents the User entity in the TaskStream AI platform, providing secure
 * persistence of user credentials, roles, permissions, and MFA settings.
 *
 * This class aligns with:
 *  - Technical Specifications/7.1 Authentication & Authorization
 *  - Technical Specifications/7.2 Data Security
 *  - Technical Specifications/7.1.2 Authorization Matrix
 *
 * It implements a wide range of security-related features, including:
 *  - Password hashing with strength checking and history to prevent reuse
 *  - Incremental tracking of failed login attempts
 *  - Multi-Factor Authentication (MFA) enablement and validation
 *  - JSON serialization that omits sensitive fields like password and MFA secret
 */
@Entity('users')
export class User implements IUser {
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Primary & Identification Fields
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Unique identifier for the user within the system.
   */
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  /**
   * Email (unique) for user login and identification across the platform.
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  public email!: string;

  /**
   * Hashed password. Omits from most serialized outputs for security.
   */
  @Column({ type: 'varchar', length: 255, select: false })
  public password!: string;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Profile Fields
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * User's first name, used in personalized displays and communications.
   */
  @Column({ type: 'varchar', length: 50 })
  public firstName!: string;

  /**
   * User's last name, used in personalized displays and communications.
   */
  @Column({ type: 'varchar', length: 50 })
  public lastName!: string;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Authorization & Role Fields
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Defined user role (e.g., ADMIN, PROJECT_MANAGER) controlling major privileges.
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DEVELOPER,
  })
  public role!: UserRole;

  /**
   * Additional permission strings beyond core role-based capabilities.
   */
  @Column({ type: 'text', array: true, default: [] })
  public permissions!: string[];

  /**
   * Indicates if the user account is active or disabled.
   */
  @Column({ type: 'boolean', default: true })
  public isActive!: boolean;

  /**
   * Records the last successful login timestamp for security auditing.
   */
  @Column({ type: 'timestamptz', nullable: true })
  public lastLogin!: Date;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Login & Security Tracking
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Number of consecutive failed login attempts. Used to trigger lockout policies.
   */
  @Column({ type: 'int', default: 0 })
  public failedLoginAttempts!: number;

  /**
   * Records the timestamp of the most recent failed login for auditing.
   */
  @Column({ type: 'timestamptz', nullable: true })
  public lastFailedLogin!: Date;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // MFA Fields
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Indicates if Multi-Factor Authentication is enabled for this user.
   */
  @Column({ type: 'boolean', default: false })
  public mfaEnabled!: boolean;

  /**
   * Stored (encrypted) secret used for generating one-time MFA tokens.
   */
  @Column({ type: 'text', nullable: true, select: false })
  public mfaSecret!: string;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Password History Fields
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Maintains a list of previously used (hashed) passwords to prevent password reuse.
   */
  @Column({ type: 'text', array: true, default: [], select: false })
  public passwordHistory!: string[];

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Metadata & Audit Fields
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Timestamp indicating when the user record was initially created.
   */
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt!: Date;

  /**
   * Timestamp indicating the last update made to the user record.
   */
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  public updatedAt!: Date;

  /**
   * Identifier for who or what created this user record (user ID or system component).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  public createdBy!: string;

  /**
   * Identifier for who or what last updated this user record.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  public updatedBy!: string;

  /**
   * Version number supporting optimistic concurrency control and tracking changes.
   */
  @Column({ type: 'int', default: 1 })
  public version!: number;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Interface Implementation for Metadata
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Provides a combined object of metadata fields (createdAt, updatedAt, etc.),
   * fulfilling the interface contract from `IUser`.
   */
  public get metadata(): Metadata {
    return {
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      version: this.version,
    };
  }

  /**
   * Populates the entity's audit fields from a `Metadata` object.
   * @param m Metadata object with creation and version information.
   */
  public set metadata(m: Metadata) {
    this.createdAt = m.createdAt;
    this.updatedAt = m.updatedAt;
    this.createdBy = m.createdBy;
    this.updatedBy = m.updatedBy;
    this.version = m.version;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Lifecycle Hooks
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Before the entity is inserted into the database, handle password hashing,
   * password reuse checks, and password strength validations.
   */
  @BeforeInsert()
  @BeforeUpdate()
  public async hashPassword(): Promise<void> {
    // 1) If no password is set, abort (common on partial updates or user is not changing password)
    if (!this.password) {
      return;
    }

    // 2) Validate password strength (basic check in this example)
    if (!this.checkPasswordStrength(this.password)) {
      throw new Error('Password not strong enough (minimum 8 characters, combination required).');
    }

    // 3) Check against password history
    const isReused = await this.isPasswordReused(this.password);
    if (isReused) {
      throw new Error('Cannot reuse one of the previously used passwords.');
    }

    // 4) Hash the password with bcrypt
    const SALT_ROUNDS = 12;
    const hashed = await hash(this.password, SALT_ROUNDS);

    // 5) If we are updating an existing password, add the new hashed password to history
    //    (limiting to last 5 entries)
    if (this.id) {
      this.passwordHistory.push(hashed);
      if (this.passwordHistory.length > 5) {
        this.passwordHistory.shift();
      }
    }

    // 6) Replace the plain text password with the hashed password
    this.password = hashed;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Password & Security Methods
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Validates a plain text password against the user's stored, hashed password.
   * @param password Plain text password to compare
   * @returns Boolean indicating match (true) or mismatch (false)
   */
  public async comparePassword(password: string): Promise<boolean> {
    return compare(password, this.password);
  }

  /**
   * Increments the counter for failed login attempts and updates the lastFailedLogin timestamp.
   * Typically called when an authentication attempt fails.
   */
  public async incrementFailedLogins(): Promise<void> {
    this.failedLoginAttempts += 1;
    this.lastFailedLogin = new Date();
  }

  /**
   * Resets the failed login attempts counter and clears the lastFailedLogin timestamp.
   * Typically called on successful authentication.
   */
  public async resetFailedLogins(): Promise<void> {
    this.failedLoginAttempts = 0;
    this.lastFailedLogin = null as unknown as Date;
  }

  /**
   * Enables Multi-Factor Authentication for the user by generating a unique secret,
   * encrypting it, then storing it on the user record. Returns the unencrypted secret
   * so the caller can generate a QR code or provide instructions.
   * @returns Newly generated MFA secret in plain text
   */
  public async enableMfa(): Promise<string> {
    const secret = authenticator.generateSecret();
    this.mfaEnabled = true;
    this.mfaSecret = this.encryptMfaSecret(secret);
    return secret;
  }

  /**
   * Validates a provided MFA token against the user's stored (encrypted) secret.
   * @param token MFA token from the user (time-based one-time password)
   * @returns Boolean indicating whether the provided token is valid
   */
  public async validateMfaToken(token: string): Promise<boolean> {
    if (!this.mfaEnabled || !this.mfaSecret) {
      return false;
    }
    const decryptedSecret = this.decryptMfaSecret(this.mfaSecret);
    return authenticator.check(token, decryptedSecret);
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Data Transformation & Serialization
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Transforms the user entity into a safe JSON object, removing sensitive fields
   * such as password, MFA secret, and password history.
   * @returns An object suitable for client-side usage
   */
  public toJSON(): Record<string, any> {
    const sanitized: Record<string, any> = {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      permissions: this.permissions,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      mfaEnabled: this.mfaEnabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      version: this.version,
    };
    return sanitized;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Internal Helpers for Password & MFA Security
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Checks if a plain text password meets basic strength requirements.
   * @param candidate Plain text password
   * @returns Boolean indicating if the password is sufficiently strong
   */
  private checkPasswordStrength(candidate: string): boolean {
    // Example: Minimum 8 chars, must contain letters and digits
    const minLength = 8;
    if (candidate.length < minLength) return false;
    const hasLetter = /[A-Za-z]/.test(candidate);
    const hasDigit = /\d/.test(candidate);
    return hasLetter && hasDigit;
  }

  /**
   * Checks if the plain text password was used previously by comparing it
   * against the hashed entries in passwordHistory.
   * @param candidate Plain text password
   * @returns Boolean indicating if it matches any historical hashed password
   */
  private async isPasswordReused(candidate: string): Promise<boolean> {
    for (const oldHashedPass of this.passwordHistory) {
      const match = await compare(candidate, oldHashedPass);
      if (match) {
        return true;
      }
    }
    return false;
  }

  /**
   * Encrypts an MFA secret using AES-256 for secure storage in the database.
   * @param secret MFA secret to encrypt
   * @returns Base64-encoded string combining IV and ciphertext
   */
  private encryptMfaSecret(secret: string): string {
    // In production, ensure the key is stored securely in environment variables or KMS
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(
      process.env.MFA_ENCRYPTION_KEY ??
        'change_this_default_key_to_32_bytes_str',
      'utf-8',
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
  }

  /**
   * Decrypts an MFA secret previously stored as an AES-256 base64 string.
   * @param encryptedSecret Base64-encoded string containing IV and ciphertext
   * @returns Decrypted plain text MFA secret
   */
  private decryptMfaSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(
      process.env.MFA_ENCRYPTION_KEY ??
        'change_this_default_key_to_32_bytes_str',
      'utf-8',
    );
    const [ivBase64, ciphertext] = encryptedSecret.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
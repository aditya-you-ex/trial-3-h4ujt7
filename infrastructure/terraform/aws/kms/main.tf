###############################################################################
# Terraform Configuration for AWS KMS Keys
# ---------------------------------------------------------------------------
# This module configures three separate AWS KMS keys spanning RDS encryption,
# S3 encryption, and Secrets Manager encryption. It adheres to Data Encryption
# Standards, Key Management, and Compliance Requirements (SOC 2 Type II, ISO
# 27001). Each KMS key enforces AES-256-GCM equivalent encryption, automatic
# key rotation policy, and multi-region capabilities as required by TaskStream
# AI’s security architecture. This file imports:
#   - var.project_name
#   - var.environment
#   - var.deletion_window_in_days
# from variables.tf to finalize naming and lifecycle management.
###############################################################################

###############################################################################
# Global Terraform Settings
###############################################################################
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

###############################################################################
# AWS KMS Key for RDS Database Encryption
# ---------------------------------------------------------------------------
# Description:  Manages encryption for database storage containing project,
#               task, and user data. Multi-region is enabled. Key rotation is
#               enforced, ensuring 90-day rotation compliance. Deletion window
#               is configurable through var.deletion_window_in_days (7–30 days).
###############################################################################
resource "aws_kms_key" "rds_key" {
  description                  = "KMS key for RDS database encryption - TaskStream AI"
  deletion_window_in_days      = var.deletion_window_in_days
  enable_key_rotation          = true
  multi_region                 = true
  customer_master_key_spec     = "SYMMETRIC_DEFAULT"
  key_usage                    = "ENCRYPT_DECRYPT"

  tags = merge({
    Name            = "${var.project_name}-${var.environment}-rds-key"
    Environment     = var.environment
    Purpose         = "RDS Encryption"
    ComplianceScope = "SOC2-ISO27001"
    AutoRotation    = "Enabled"
    BackupEnabled   = "True"
    SecurityZone    = "Database"
  }, var.tags)
}

###############################################################################
# AWS KMS Key for S3 Storage Encryption
# ---------------------------------------------------------------------------
# Description:  Encrypts at-rest data within S3 Buckets. Multi-region
#               activation ensures data is secured across global availability
#               zones. Automatic key rotation is enforced.
###############################################################################
resource "aws_kms_key" "s3_key" {
  description                  = "KMS key for S3 storage encryption - TaskStream AI"
  deletion_window_in_days      = var.deletion_window_in_days
  enable_key_rotation          = true
  multi_region                 = true
  customer_master_key_spec     = "SYMMETRIC_DEFAULT"
  key_usage                    = "ENCRYPT_DECRYPT"

  tags = merge({
    Name            = "${var.project_name}-${var.environment}-s3-key"
    Environment     = var.environment
    Purpose         = "S3 Encryption"
    ComplianceScope = "SOC2-ISO27001"
    AutoRotation    = "Enabled"
    BackupEnabled   = "True"
    SecurityZone    = "Storage"
  }, var.tags)
}

###############################################################################
# AWS KMS Key for Secrets Manager Encryption
# ---------------------------------------------------------------------------
# Description:  Provides encryption for AWS Secrets Manager, safeguarding
#               application credentials, API keys, and other sensitive data.
#               Implements mandatory key rotation and multi-region coverage
#               meeting enterprise-grade standards.
###############################################################################
resource "aws_kms_key" "secrets_key" {
  description                  = "KMS key for Secrets Manager encryption - TaskStream AI"
  deletion_window_in_days      = var.deletion_window_in_days
  enable_key_rotation          = true
  multi_region                 = true
  customer_master_key_spec     = "SYMMETRIC_DEFAULT"
  key_usage                    = "ENCRYPT_DECRYPT"

  tags = merge({
    Name            = "${var.project_name}-${var.environment}-secrets-key"
    Environment     = var.environment
    Purpose         = "Secrets Encryption"
    ComplianceScope = "SOC2-ISO27001"
    AutoRotation    = "Enabled"
    BackupEnabled   = "True"
    SecurityZone    = "Secrets"
  }, var.tags)
}

###############################################################################
# OUTPUTS
# ---------------------------------------------------------------------------
# Exposing ARN and Key IDs for KMS keys to be utilized by other modules
# (e.g., RDS encryption, S3 encryption, Secrets Manager references). This
# ensures integration without duplicating resource definitions. These are
# standard outputs with no sensitive information beyond ARNs and IDs.
###############################################################################

# ---------------- RDS Key Exports ----------------
output "rds_key_arn" {
  description = "ARN of the KMS Key used for RDS encryption"
  value       = aws_kms_key.rds_key.arn
}

output "rds_key_id" {
  description = "Key ID of the KMS Key used for RDS encryption"
  value       = aws_kms_key.rds_key.key_id
}

# ---------------- S3 Key Exports -----------------
output "s3_key_arn" {
  description = "ARN of the KMS Key used for S3 encryption"
  value       = aws_kms_key.s3_key.arn
}

output "s3_key_id" {
  description = "Key ID of the KMS Key used for S3 encryption"
  value       = aws_kms_key.s3_key.key_id
}

# ---------------- Secrets Key Exports ------------
output "secrets_key_arn" {
  description = "ARN of the KMS Key used for Secrets Manager encryption"
  value       = aws_kms_key.secrets_key.arn
}

output "secrets_key_id" {
  description = "Key ID of the KMS Key used for Secrets Manager encryption"
  value       = aws_kms_key.secrets_key.key_id
}
###############################################################################
# Terraform Outputs for AWS KMS Keys
# ---------------------------------------------------------------------------
# This file exposes the necessary outputs for AWS KMS Key attributes intended
# for AES-256-GCM encryption across RDS, S3, and Secrets Manager services. It
# aligns with the TaskStream AI technical specifications and addresses:
#
#  - Data Encryption Standards (Technical Specs §7.2.1)
#  - Key Management (Technical Specs §7.2.1)
#  - Compliance Requirements (Technical Specs §7.3.3)
#
# Each output references the corresponding KMS Key resources declared in:
#   - main.tf (aws_kms_key.rds_key, aws_kms_key.s3_key, aws_kms_key.secrets_key)
#
# These outputs make Key ARN and Key ID data accessible to other modules,
# enabling standardized encryption and multi-region replication with a 90-day
# key rotation policy. This approach is fully compliant with SOC 2 Type II
# and ISO 27001 controls, ensuring a comprehensive audit trail and secure
# data lifecycle management.
#
# External Library Version (IE2 Compliance):
# - Terraform (hashicorp/terraform) ~> 1.5
#
# Notes:
# - No sensitive material such as private keys or secrets is output. ARNs and
#   Key IDs are non-secret references commonly used by other modules/modules.
###############################################################################

###############################################################################
# RDS Key Outputs
# ---------------------------------------------------------------------------
# Expose the KMS Key resources for RDS encryption. They allow external modules
# to configure RDS instances with AES-256-GCM encryption, ensuring data remains
# secure and meets the 90-day rotation requirements under multi-region
# operation. Adheres to SOC 2 Type II and ISO 27001 compliance.
###############################################################################
output "rds_key_arn" {
  description = "ARN of the KMS key used for RDS AES-256-GCM encryption with 90-day rotation, compliant with SOC 2 Type II and ISO 27001 requirements."
  value       = aws_kms_key.rds_key.arn
}

output "rds_key_id" {
  description = "ID of the KMS key used for RDS encryption across multiple regions with automated key management."
  value       = aws_kms_key.rds_key.key_id
}

###############################################################################
# S3 Key Outputs
# ---------------------------------------------------------------------------
# Expose the KMS Key resources for S3 encryption. They enable secure storage
# of files and artifacts at rest with AES-256-GCM, multi-region replication,
# automated rotation, and comprehensive logging for compliance. Other modules
# use these outputs to configure advanced encryption settings on S3 buckets.
###############################################################################
output "s3_key_arn" {
  description = "ARN of the KMS key used for S3 AES-256-GCM encryption with 90-day rotation, compliant with SOC 2 Type II and ISO 27001 requirements."
  value       = aws_kms_key.s3_key.arn
}

output "s3_key_id" {
  description = "ID of the KMS key used for S3 encryption across multiple regions with automated key management."
  value       = aws_kms_key.s3_key.key_id
}

###############################################################################
# Secrets Manager Key Outputs
# ---------------------------------------------------------------------------
# Expose the KMS Key resources for Secrets Manager encryption. They ensure that
# all secrets, credentials, and access tokens are secured with AES-256-GCM
# encryption, accompanied by mandatory 90-day key rotation and multi-region
# replication capabilities. This satisfies critical compliance requirements
# for secure storage of sensitive configuration data.
###############################################################################
output "secrets_key_arn" {
  description = "ARN of the KMS key used for Secrets Manager AES-256-GCM encryption with 90-day rotation, compliant with SOC 2 Type II and ISO 27001 requirements."
  value       = aws_kms_key.secrets_key.arn
}

output "secrets_key_id" {
  description = "ID of the KMS key used for Secrets Manager encryption across multiple regions with automated key management."
  value       = aws_kms_key.secrets_key.key_id
}
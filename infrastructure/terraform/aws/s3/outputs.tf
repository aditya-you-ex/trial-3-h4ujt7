###############################################################################
# Terraform Outputs for AWS S3 Buckets
# ---------------------------------------------------------------------------
# (IE2) External Library Version:
#   - terraform (hashicorp/terraform) ~> 1.5
#
# This file exports essential attributes for the AWS S3 buckets used within
# TaskStream AI’s infrastructure. These outputs enable other modules or
# stacks to reference bucket names, ARNs, domains, and lifecycle settings
# for critical features such as document storage, static asset hosting, and
# backup retention policies. Each output aligns with enterprise security
# and compliance requirements (SOC 2 Type II, ISO 27001).
#
# References to resources in main.tf:
#   - aws_s3_bucket.document_storage   (Confidential docs & cross-region replication)
#   - aws_s3_bucket.static_assets      (Public/Static site hosting)
#   - aws_s3_bucket.backup_storage     (Restricted backups & lifecycle policies)
#
# All outputs are explicitly marked as non-sensitive unless otherwise required
# by the compliance constraints. This code strictly adheres to the enterprise
# standards from the Technical Specifications documentation, including sections
# on data storage (4.3.2) and security compliance (7.1).
###############################################################################

#############################
# Document Storage Outputs
#############################

# Document Storage S3 Bucket ID
# Provides a unique ID reference for the bucket that holds confidential documents
# with cross-region replication and strong encryption.
output "document_bucket_id" {
  description = "ID of the document storage S3 bucket with cross-region replication enabled"
  value       = aws_s3_bucket.document_storage.id
  sensitive   = false
}

# Document Storage S3 Bucket ARN
# Exposes the ARN, typically used by IAM policies and other AWS services
# that integrate with the document bucket.
output "document_bucket_arn" {
  description = "ARN of the document storage S3 bucket for IAM policy configuration"
  value       = aws_s3_bucket.document_storage.arn
  sensitive   = false
}

# Document Storage S3 Bucket Domain
# Allows referencing the fully qualified domain name for endpoint or routing
# configurations in external modules or microservices that interact with
# sensitive document content in the bucket.
output "document_bucket_domain" {
  description = "Domain name of the document storage S3 bucket for application configuration"
  value       = aws_s3_bucket.document_storage.bucket_domain_name
  sensitive   = false
}

#############################
# Static Assets Outputs
#############################

# Static Assets S3 Bucket ID
# Unique ID for the bucket that hosts publicly accessible static files,
# frequently integrated with a CDN like CloudFront.
output "assets_bucket_id" {
  description = "ID of the static assets S3 bucket integrated with CloudFront CDN"
  value       = aws_s3_bucket.static_assets.id
  sensitive   = false
}

# Static Assets S3 Bucket ARN
# ARN reference for applying IAM policies and configuring advanced features
# such as bucket-level access logging or AWS WAF-based content filtering.
output "assets_bucket_arn" {
  description = "ARN of the static assets S3 bucket for CDN and IAM policy configuration"
  value       = aws_s3_bucket.static_assets.arn
  sensitive   = false
}

# Static Assets S3 Bucket Domain
# Provides the domain name of the static asset bucket for usage as an origin
# within a CDN distribution or direct HTTP serving (if publicly accessible).
output "assets_bucket_domain" {
  description = "Domain name of the static assets S3 bucket for CDN origin configuration"
  value       = aws_s3_bucket.static_assets.bucket_domain_name
  sensitive   = false
}

# Static Assets S3 Bucket Website Endpoint
# Specifically exposes the website endpoint for direct site hosting,
# beneficial when serving static websites without a dedicated CDN.
output "assets_bucket_website" {
  description = "Website endpoint of the static assets S3 bucket for direct access"
  value       = aws_s3_bucket.static_assets.website_endpoint
  sensitive   = false
}

#############################
# Backup Storage Outputs
#############################

# Backup Storage S3 Bucket ID
# Provides the bucket ID that manages restricted backups, enforced encryption,
# and specific lifecycle rules to transition objects to lower-cost storage.
output "backup_bucket_id" {
  description = "ID of the backup storage S3 bucket with lifecycle policies"
  value       = aws_s3_bucket.backup_storage.id
  sensitive   = false
}

# Backup Storage S3 Bucket ARN
# ARN used for integrating backups with external services or for applying
# granular IAM permissions for restore, data audits, and compliance checks.
output "backup_bucket_arn" {
  description = "ARN of the backup storage S3 bucket for IAM policy configuration"
  value       = aws_s3_bucket.backup_storage.arn
  sensitive   = false
}

# Backup Storage S3 Bucket Domain
# Domain name reference, aiding in secure backup configurations and maintenance
# tasks that require object storage endpoint identification.
output "backup_bucket_domain" {
  description = "Domain name of the backup storage S3 bucket for backup configuration"
  value       = aws_s3_bucket.backup_storage.bucket_domain_name
  sensitive   = false
}

# Backup Storage S3 Bucket Lifecycle Rules
# Explicitly exposes the lifecycle rules, ensuring retention periods and
# transitions to Glacier or other storage classes are clearly available
# for cross-module usage and regulatory audits.
output "backup_bucket_lifecycle" {
  description = "Lifecycle rules of the backup storage S3 bucket for retention management"
  value       = aws_s3_bucket.backup_storage.lifecycle_rules
  sensitive   = false
}
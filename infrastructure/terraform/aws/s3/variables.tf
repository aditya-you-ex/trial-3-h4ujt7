###############################################################################
# Terraform Variables for AWS S3 Bucket Configuration
# ---------------------------------------------------------------------------
# This file defines and documents all variables required to configure S3
# bucket resources for TaskStream AI. It includes:
#  - Naming conventions (project_name, bucket_prefix)
#  - Environment handling (environment)
#  - Resource tagging (tags)
#  - Lifecycle policies (lifecycle_rules)
#  - CORS configuration (cors_rules)
#
# These variables fulfill the following requirements from the technical specs:
#  - Document Storage (4.3.2): Cross-region replication alignment (supported
#    by referencing bucket_prefix and environment).
#  - Data Security (7.2.1): AES-256-GCM encryption via AWS KMS Key (referenced
#    by external modules using s3_key_arn from KMS outputs).
#  - Storage Services (4.2): S3 configuration for static assets (e.g., CDN).
#
# External Library Version (IE2 Compliance):
#  - Terraform (hashicorp/terraform) ~> 1.5
#
# Note:
#  - This file does not directly define the S3 bucket resource; instead,
#    it provides a flexible and production-grade variable set for any module
#    creating or managing TaskStream AI S3 buckets.
###############################################################################

################################################################################
# PROJECT NAME
# ------------------------------------------------------------------------------
# Identifies the overarching project name for resource naming across S3
# buckets and related components. Default is "taskstream" for convenience.
################################################################################
variable "project_name" {
  type        = string
  description = "Name of the project used for resource naming"

  # Default set to 'taskstream' to maintain consistency across multiple
  # environments within TaskStream AI's infrastructure.
  default = "taskstream"
}

################################################################################
# ENVIRONMENT
# ------------------------------------------------------------------------------
# Specifies the environment of the S3 resources (e.g., dev, staging, prod).
# This ensures consistent, environment-specific tagging, naming, and usage
# protocols. Validation only allows dev, staging, or prod to maintain strict
# naming standards for all TaskStream AI deployments.
################################################################################
variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

################################################################################
# BUCKET PREFIX
# ------------------------------------------------------------------------------
# Establishes a prefix for S3 bucket names. This prefix can be combined with the
# project_name and environment to yield unique, descriptive bucket identifiers.
# Facilitates multi-environment or multi-region naming conventions.
################################################################################
variable "bucket_prefix" {
  type        = string
  description = "Prefix for S3 bucket names"

  # Default prefix set to 'taskstream-storage' for consistency across the
  # TaskStream AI platform’s S3 usage for static assets, documentation files, etc.
  default = "taskstream-storage"
}

################################################################################
# TAGS
# ------------------------------------------------------------------------------
# Key-value pairs for tagging all S3 bucket resources. These help track costs,
# identify ownership, and maintain compliance with organizational policies.
# Defaults include basic identification details such as Project and
# ManagedBy. Additional tags may be added as needed.
################################################################################
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all S3 resources"

  default = {
    Project   = "TaskStream"
    ManagedBy = "Terraform"
  }
}

################################################################################
# LIFECYCLE RULES
# ------------------------------------------------------------------------------
# Configurable lifecycle policies for managing object transitions and expiration
# within the S3 bucket. By default, 'documents' transition to cheaper storage
# after 90 days and expire at 365 days, while 'backups' transition after 30 days
# and expire at 90 days. This approach lowers storage costs and maintains
# operational efficiency.
################################################################################
variable "lifecycle_rules" {
  type = map(object({
    transition_days = number
    expiration_days = number
  }))

  description = "Lifecycle rules for S3 bucket objects"

  default = {
    documents = {
      transition_days = 90
      expiration_days = 365
    }
    backups = {
      transition_days = 30
      expiration_days = 90
    }
  }
}

################################################################################
# CORS RULES
# ------------------------------------------------------------------------------
# Specifies Cross-Origin Resource Sharing (CORS) configurations for the S3
# buckets. Ensures that requests from specified origins or methods can access
# bucket objects, useful when integrating with web applications or external
# services. Default policy allows GET and HEAD methods from any origin, with
# a maximum cache age of 3600 seconds.
################################################################################
variable "cors_rules" {
  type = map(object({
    allowed_origins  = list(string)
    allowed_methods  = list(string)
    max_age_seconds  = number
  }))

  description = "CORS rules for S3 buckets"

  default = {
    web = {
      allowed_origins = ["*"]
      allowed_methods = ["GET", "HEAD"]
      max_age_seconds = 3600
    }
  }
}
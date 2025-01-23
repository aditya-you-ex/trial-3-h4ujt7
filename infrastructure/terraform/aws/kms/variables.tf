# ----------------------------------------------------------------------
# External Import Reference (terraform - hashicorp/terraform ~> 1.5)
# This file defines Terraform variables for AWS KMS resources, aligned
# with SOC 2 Type II and ISO 27001 requirements. It includes configuration
# parameters for project naming, environment handling, key deletion windows,
# and tagging. All validations comply with the encryption and key management
# guidelines specified in the technical documentation.
# ----------------------------------------------------------------------

# ------------------------------------------------------------------------------------------------
# Variable: project_name
# Purpose : Identifies the project name to be appended within KMS resource naming conventions.
# Type    : string
# Notes   : Must start with a letter and follow the pattern of letters, digits, and hyphens only.
# ------------------------------------------------------------------------------------------------
variable "project_name" {
  type        = string
  description = "Name of the project used for resource naming"

  # Validation ensures compliance with naming standards (letters, numbers, hyphens).
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.project_name))
    error_message = "Project name must start with a letter and can contain letters, numbers, and hyphens."
  }
}

# ------------------------------------------------------------------------------------------------
# Variable: environment
# Purpose : Specifies the environment for the KMS resources (e.g., dev, staging, prod).
# Type    : string
# Notes   : Must be one of the defined environment types to ensure consistent tagging and usage.
# ------------------------------------------------------------------------------------------------
variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"

  # Validation ensures only approved environments are utilized.
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# ------------------------------------------------------------------------------------------------
# Variable: deletion_window_in_days
# Purpose : Configures how many days to wait before a KMS key is permanently deleted.
# Type    : number
# Default : 30
# Range   : 7 <= deletion_window_in_days <= 30
# ------------------------------------------------------------------------------------------------
variable "deletion_window_in_days" {
  type        = number
  description = "Duration in days before a KMS key is deleted after being scheduled for deletion"
  default     = 30

  # Validation enforces a minimum of 7 days and a maximum of 30 days.
  validation {
    condition     = var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30
    error_message = "Deletion window must be between 7 and 30 days."
  }
}

# ------------------------------------------------------------------------------------------------
# Variable: tags
# Purpose : Applies additional metadata tags to KMS resources for cost center, ownership, etc.
# Type    : map(string)
# Default : {}
# Notes   : Allows dynamic extension of tagging with no strict requirement on specific keys.
# ------------------------------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to KMS key resources"
  default     = {}
}
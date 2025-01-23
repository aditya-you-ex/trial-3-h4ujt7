###############################################################################
# TaskStream AI - AWS Provider Configuration
#
# Description:
#   This file defines the AWS provider settings for the TaskStream AI platform,
#   implementing enterprise-grade security, assume-role capabilities, multi-region
#   support, and a robust tagging strategy. It references variables for region,
#   environment, and project naming, thereby ensuring consistent infrastructure
#   configuration across all AWS resources.
#
# Requirements Addressed:
#   1) Multi-Region Deployment (Tech Spec 8.1):
#      - region = var.aws_region ties resource creation to a specified AWS region
#        for high availability and global scalability.
#   2) Infrastructure as Code (Tech Spec 8.5):
#      - Enforces strict version constraints and standardizes AWS provider
#        configuration, including feature flags for assume_role and default_tags.
#   3) Security Standards (Tech Spec 7.2):
#      - Implements assume_role for secure credential handling and
#        applies comprehensive tagging for compliance.
###############################################################################

###############################################################################
# Terraform Block
# Enforces specific Terraform and AWS provider versions to match enterprise
# compliance, stability, and repeatable IaC practices.
###############################################################################
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
}

###############################################################################
# Optional Variable: assume_role_arn
# Purpose:
#   Used by the AWS provider to assume a designated IAM role with appropriate
#   permissions, enhancing security by not relying on long-lived static
#   credentials. This variable can be set externally (e.g., CI/CD secrets) or
#   defaults to an empty string which disables assume_role.
###############################################################################
variable "assume_role_arn" {
  type        = string
  description = "IAM Role ARN to assume for secure deployments"
  default     = ""
}

###############################################################################
# AWS Provider Configuration
#   - region:       Points to var.aws_region for multi-region coverage.
#   - assume_role:  Uses var.assume_role_arn if non-empty, enabling ephemeral
#                   security credentials. Includes a session name reference to
#                   var.environment for clarity.
#   - default_tags: Enforces consistent metadata across AWS resources, aiding
#                   cost allocation, operational policies, and compliance checks.
#   - ignore_tags:  Explicitly set to an empty configuration to not ignore any
#                   tags (aligns with JSON specification "ignore_tags" = false).
###############################################################################
provider "aws" {
  # Multi-region support via var.aws_region (referenced from variables.tf).
  region = var.aws_region

  # Conditional assume_role for advanced security posture. If assume_role_arn
  # is empty, no role will be assumed; otherwise, an STS session is initiated.
  # The session_name includes environment for clarity when auditing STS logs.
  # For demonstration, we assume the user sets this variable externally.
  # Example: terraform apply -var="assume_role_arn=arn:aws:iam::123456789012:role/TaskStreamDeployRole"
  # Remove or adjust if not needed.
  assume_role {
    role_arn     = var.assume_role_arn
    session_name = "TaskStreamAI-${var.environment}"
  }

  # Applies a consistent, enterprise-compliant set of tags to every AWS resource
  # managed by this provider. This helps unify resource tracking, cost analysis,
  # and compliance enforcement. The 'CreatedAt' tag is dynamically set via
  # Terraform's timestamp() function for traceability.
  default_tags = {
    Environment   = var.environment
    Project       = var.project
    ManagedBy     = "terraform"
    CreatedAt     = timestamp()
    SecurityLevel = "high"
  }

  # Explicitly disable ignoring any keys or key_prefixes, ensuring all tags
  # specified in default_tags or at the resource level are preserved.
  ignore_tags {
    keys         = []
    key_prefixes = []
  }

  # The features block can be used to enable or disable advanced AWS provider
  # functionalities. While not strictly required, it is shown here as part of
  # an enterprise-grade setup if features need customization.
  # (Listed as a placeholder to illustrate future expansions or feature flags.)
  features {}
}
###############################################################################
# TaskStream AI - Core AWS Variables Definition
#
# Description:
#   This Terraform variables file provides global configuration parameters
#   for the TaskStream AI platform on AWS. It unifies key infrastructure,
#   security, and environment-related values used across multiple modules.
#
# Requirements Addressed:
#   1) Multi-Region Deployment (Tech Spec 8.1):
#      - var.aws_region and var.availability_zones facilitate high
#        availability and global scalability.
#   2) Infrastructure as Code (Tech Spec 8.5):
#      - Defines variables in Terraform for standardized, immutable
#        provisioning.
#   3) Security Standards (Tech Spec 7.2):
#      - Encryption-enabled variables (enable_encryption, kms_key_deletion_window)
#        and associated validations to ensure enterprise-grade security.
#
# Imports:
#   - External (IE2): hashicorp/terraform (~> 1.5)
#     Provides core Terraform functionality for variable definitions.
#   - Internal (IE1):
#       * EKS Variables (infrastructure/terraform/aws/eks/variables.tf)
#           - cluster_name
#           - cluster_version
#       * RDS Variables (infrastructure/terraform/aws/rds/variables.tf)
#           - engine_version
#
# Style (S1 & S2):
#   - Enterprise-grade, production-ready coding style.
#   - Extensively commented for clarity, maintainability, and compliance.
###############################################################################

terraform {
  required_version = "~> 1.5" # Using hashicorp/terraform v1.5
}

###############################################################################
# Variable: project
# Purpose:
#   Identifies the name of the TaskStream AI project, used for global
#   naming of AWS resources. Must contain only lowercase alphanumeric
#   characters and hyphens.
###############################################################################
variable "project" {
  type        = string
  description = "Name of the TaskStream AI project for resource naming"
  default     = "taskstream-ai"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project name must contain only lowercase alphanumeric characters and hyphens."
  }
}

###############################################################################
# Variable: environment
# Purpose:
#   Defines the deployment environment, controlling resource isolation,
#   naming, and configuration. Accepted values: development, staging, production.
###############################################################################
variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

###############################################################################
# Variable: aws_region
# Purpose:
#   Specifies the primary AWS region where resources will be deployed for
#   multi-region support in high availability architectures.
###############################################################################
variable "aws_region" {
  type        = string
  description = "Primary AWS region for resource deployment"
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d$", var.aws_region))
    error_message = "AWS region must be a valid region identifier."
  }
}

###############################################################################
# Variable: enable_encryption
# Purpose:
#   Enables or disables encryption for all resources that support
#   encryption at rest (e.g., RDS, S3, EBS).
###############################################################################
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption for all supported resources"
  default     = true
}

###############################################################################
# Variable: kms_key_deletion_window
# Purpose:
#   Defines the number of days to wait before a KMS CMK is deleted,
#   ensuring data recovery and compliance with retention policies.
###############################################################################
variable "kms_key_deletion_window" {
  type        = number
  description = "KMS key deletion window in days"
  default     = 30

  validation {
    condition     = var.kms_key_deletion_window >= 7 && var.kms_key_deletion_window <= 30
    error_message = "KMS key deletion window must be between 7 and 30 days."
  }
}

###############################################################################
# Variable: vpc_cidr
# Purpose:
#   The IPv4 CIDR block for the core AWS VPC. Ensures network segmentation
#   and provides an address space for the entire platform.
###############################################################################
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

###############################################################################
# Variable: availability_zones
# Purpose:
#   A list of at least two AWS Availability Zones used by the platform
#   to achieve multi-AZ redundancy and high availability.
###############################################################################
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones to use for resources"

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified."
  }
}

###############################################################################
# Variable: common_tags
# Purpose:
#   A map of tags applied globally to AWS resources, ensuring consistent
#   metadata for cost allocation, compliance, and resource ownership.
###############################################################################
variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default     = {
    Project   = "TaskStream-AI"
    ManagedBy = "terraform"
  }
}

###############################################################################
# Variable: backup_retention_days
# Purpose:
#   Specifies the default number of days to retain backups across supported
#   services, aligning with enterprise data retention policies.
###############################################################################
variable "backup_retention_days" {
  type        = number
  description = "Default backup retention period in days"
  default     = 35

  validation {
    condition     = var.backup_retention_days >= 35
    error_message = "Backup retention must be at least 35 days."
  }
}

###############################################################################
# Variable: monitoring_enabled
# Purpose:
#   Toggles enhanced monitoring for AWS services that support operational
#   insights, such as RDS Performance Insights or EKS control plane logging.
###############################################################################
variable "monitoring_enabled" {
  type        = bool
  description = "Enable enhanced monitoring for supported resources"
  default     = true
}

###############################################################################
# Variable: cluster_name
# Purpose:
#   References the EKS cluster name from the internal EKS variables file
#   (infrastructure/terraform/aws/eks/variables.tf). Must match the same
#   naming constraints required by that file.
###############################################################################
variable "cluster_name" {
  type        = string
  description = "Imported EKS cluster name (reference to EKS module)"
  # No default to strictly require user input or to be set by root module.
  validation {
    condition = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name)) && length(var.cluster_name) <= 100
    error_message = "Cluster name must start with a letter, contain only alphanumeric/hyphen chars, and be <= 100 chars."
  }
}

###############################################################################
# Variable: cluster_version
# Purpose:
#   References the EKS Kubernetes version from the internal EKS variables file
#   (infrastructure/terraform/aws/eks/variables.tf), ensuring version alignment
#   across the platform.
###############################################################################
variable "cluster_version" {
  type        = string
  description = "Imported EKS Kubernetes version"
  default     = "1.27"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.cluster_version))
    error_message = "Cluster version must be in valid 'X.Y' numeric format."
  }
}

###############################################################################
# Variable: engine_version
# Purpose:
#   References the Aurora PostgreSQL engine version from the internal RDS
#   variables file (infrastructure/terraform/aws/rds/variables.tf). Must align
#   with enterprise database standards (PostgreSQL 14+).
###############################################################################
variable "engine_version" {
  type        = string
  description = "Imported Aurora PostgreSQL engine version (reference to RDS module)"
  default     = "14.9"

  validation {
    condition     = can(regex("^14\\.[0-9]+$", var.engine_version))
    error_message = "Engine version must be PostgreSQL 14.x"
  }
}

###############################################################################
# Exports (IE3):
#   Expose key variables for potential cross-module references. Implemented
#   as Terraform output blocks to facilitate reuse and avoid duplication.
###############################################################################

output "project" {
  description = "Project name for resource naming and tagging"
  value       = var.project
}

output "environment" {
  description = "Environment name for resource configuration"
  value       = var.environment
}

output "aws_region" {
  description = "Primary AWS region for resource deployment"
  value       = var.aws_region
}
###############################################################################
# TaskStream AI - AWS IAM Variables Definition
#
# Description:
#   This file defines all Terraform variables required to configure AWS IAM
#   roles, policies, and permissions aligned with TaskStream AI’s microservices
#   architecture. It supports essential security constructs such as RBAC +
#   ABAC for Access Control (Tech Specs §7.3.1), ISO 27001 and SOC 2 Type II
#   compliance (Tech Specs §7.3.3), and container security for EKS clusters
#   (Tech Specs §8.4). Variables include settings for the project name,
#   environment, region, IRSA-related service accounts, and tagging for resource
#   tracking, compliance, and security auditing.
#
# Internal Imports (IE1):
#   - eks_outputs from ../eks/outputs.tf:
#       cluster_name (string)
#       cluster_oidc_issuer_url (string)
#     Purpose: Potentially referenced in IAM roles or resource creation for IRSA
#     associations. Although not declared here as variables, these outputs are
#     widely used to link EKS OIDC with IAM policies for service accounts.
#
# External Imports (IE2):
#   - None for this file. However, AWS provider (hashicorp/aws ~> 5.0) is
#     assumed for all IAM interactions in the larger environment.
#
# Security & Compliance:
#   - The usage of these variables ensures alignment with enterprise-level
#     security (Tech Specs §7.3.3), least privilege (Tech Specs §7.3.1),
#     and container orchestration boundary controls (Tech Specs §8.4).
#
# Style & Comments:
#   - Written in an enterprise, production-ready style with extensive comments
#     to facilitate clarity and maintainability in large-scale infrastructure
#     projects.
###############################################################################

###############################################################################
# Variable: project_name
# -------------------------------------------------------------------------------
# Purpose:
#   This variable represents the primary name for the TaskStream AI project.
#   It is used as a prefix or identifier across IAM resources, ensuring
#   consistent, trackable naming conventions for compliance (Tech Specs §7.3.3).
#
# Constraints & Validation:
#   - Must not exceed 64 characters in length (organizational naming policy).
#   - Must start with a letter (a-z or A-Z) and can include letters, digits,
#     or hyphens to align with common AWS naming patterns.
#
# Relevance to Security & Compliance:
#   - Helps unify resource naming for audit logs (ISO 27001 and SOC 2).
#   - Ensures that all IAM resources can be traced back to a specific project.
###############################################################################
variable "project_name" {
  type        = string
  description = "Name of the TaskStream AI project for resource naming and compliance tracking"

  validation {
    condition     = length(var.project_name) <= 64 && can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.project_name))
    error_message = "Project name must be 64 characters or less and start with a letter, containing only alphanumeric characters and hyphens"
  }
}

###############################################################################
# Variable: environment
# -------------------------------------------------------------------------------
# Purpose:
#   Denotes the deployment environment for isolating IAM role sets, restricting
#   resource usage by environment, and applying environment-specific security
#   policies. Typical values are "development", "staging", or "production"
#   (Tech Specs §7.3.1 Access Control).
#
# Constraints & Validation:
#   - Must be one of ["development", "staging", "production"].
#   - Supports robust environment separation, enabling different levels of
#     auditing and compliance checks across environments (SOC 2 Type II).
###############################################################################
variable "environment" {
  type        = string
  description = "Deployment environment for resource isolation and access control"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

###############################################################################
# Variable: region
# -------------------------------------------------------------------------------
# Purpose:
#   Specifies which AWS region will host IAM resources relevant to the
#   TaskStream AI microservices. This aligns with cross-region replication
#   and failover strategies (Tech Specs §2.5 & §7.3.3), ensuring data remains
#   close to the cluster for minimal latency while also maintaining the
#   region’s compliance requirements.
#
# Default:
#   - "us-east-1", given the frequent usage of this region for multi-region
#     authoritative IAM references in enterprise setups.
#
# Validation:
#   - Must follow the standard AWS region format (e.g., us-east-1).
###############################################################################
variable "region" {
  type        = string
  description = "AWS region for IAM resource deployment and cross-region replication"
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.region))
    error_message = "Region must be a valid AWS region format (e.g., us-east-1)"
  }
}

###############################################################################
# Variable: service_accounts
# -------------------------------------------------------------------------------
# Purpose:
#   Holds configuration definitions for Kubernetes service accounts requiring
#   IAM Roles for Service Accounts (IRSA). Each entry includes:
#     - namespace: K8s namespace within EKS (<= 64 chars)
#     - service_account: K8s service account name
#     - policies: List of IAM policies to attach (must have at least one)
#     - permissions_boundary: ARN of a managed IAM policy that sets the
#       maximum permissions boundary, supporting least privilege for EKS.
#
# Significance & Compliance:
#   - Facilitates granular ABAC-based IRSA approach (Tech Specs §8.4).
#   - Ensures that each service account is bound by a restricted set of
#     policies, aligning with ISO 27001, SOC 2 Type II requirements, and
#     organizational RBAC guidelines (Tech Specs §7.3.1).
#
# Validation:
#   - Enforces maximum 64 characters for namespace fields.
#   - Ensures that each service account attaches at least one policy.
###############################################################################
variable "service_accounts" {
  type = map(
    object({
      namespace            = string
      service_account      = string
      policies             = list(string)
      permissions_boundary = string
    })
  )

  description = "Comprehensive service account configurations for IRSA with policy mappings and security boundaries"

  validation {
    condition = alltrue([
      for k, v in var.service_accounts :
      length(v.namespace) <= 64 && length(v.policies) > 0
    ])
    error_message = "Service account namespace must be 64 characters or less and at least one policy must be specified"
  }
}

###############################################################################
# Variable: tags
# -------------------------------------------------------------------------------
# Purpose:
#   Applies a standardized set of tags across IAM resources for classification,
#   cost tracking, and compliance alignment (Tech Specs §7.3.3). The default
#   tags carry an internal compliance scope, security posture, and environment
#   association.
#
# Default Values:
#   - Project: "TaskStream-AI"
#   - ManagedBy: "terraform"
#   - SecurityLevel: "high"
#   - ComplianceScope: "soc2-iso27001"
#   - Environment: "var.environment"
#
# Importance:
#   - Enhances discovery, governance, and policy enforcement by bridging
#     resource metadata with monitoring tools (ISO 27001 & SOC 2).
#   - Facilitates role-based queries and cost distribution across multiple
#     AWS accounts and environments.
###############################################################################
variable "tags" {
  type        = map(string)
  description = "Resource tags for security classification and compliance tracking"

  default = {
    Project         = "TaskStream-AI"
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    ComplianceScope = "soc2-iso27001"
    Environment     = "var.environment"
  }
}
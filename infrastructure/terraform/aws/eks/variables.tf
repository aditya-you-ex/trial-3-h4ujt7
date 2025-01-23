###############################################################################
# TaskStream AI - EKS Variables Definition
#
# Description:
#   This Terraform variables file defines all configurable parameters related
#   to AWS EKS resources, including the EKS cluster itself, node groups, and
#   add-on configurations. It also incorporates references to the underlying
#   VPC outputs so that the EKS cluster can be properly networked within a
#   multi-AZ deployment.
#
# Requirements Addressed:
#   1) Container Orchestration (Multi-region AWS EKS)
#   2) Kubernetes Infrastructure (EKS cluster configuration with specific node groups)
#   3) Infrastructure Scaling (Detailed node group specs & resource limits)
#
# Internal Import (IE1):
#   - Reference VPC outputs (vpc_id, private_subnet_ids) to network EKS within
#     the correct subnets, ensuring highly available cluster design.
#
# Style (S1 & S2):
#   - Enterprise-grade coding style with extensive comments for clarity.
###############################################################################

###############################################################################
# Terraform Configuration (Optional but recommended for consistency)
###############################################################################
terraform {
  required_version = ">= 1.0.0"
}

###############################################################################
# Variable: vpc_id
# Purpose:
#   Accepts a VPC ID (i.e., from the VPC module’s outputs) to place the EKS
#   cluster’s networking resources in the correct AWS VPC. Ensures cluster
#   runs within multi-AZ architecture.
# Members:
#   - type: string
#   - description: The ID of the VPC used for clustering
#   - validation: Optional pattern check for vpc-XXXXXXXX, as needed
###############################################################################
variable "vpc_id" {
  type        = string
  description = "The ID of the VPC into which the EKS cluster will be deployed"

  validation {
    condition     = can(regex("^vpc-([0-9a-f]{8,17})$", var.vpc_id))
    error_message = "The provided vpc_id does not appear to be a valid AWS VPC ID (vpc-xxxxxxxx)."
  }
}

###############################################################################
# Variable: private_subnet_ids
# Purpose:
#   Accepts a list of private subnet IDs for hosting EKS node groups. Ensures
#   the cluster worker nodes remain secure and non-publicly accessible by
#   default, following enterprise security standards.
# Members:
#   - type: list(string)
#   - description: Private subnet IDs for EKS node groups
#   - validation: Requires at least one subnet to be provided
###############################################################################
variable "private_subnet_ids" {
  type        = list(string)
  description = "A list of private subnet IDs where EKS node groups will reside"

  validation {
    condition     = length(var.private_subnet_ids) >= 1
    error_message = "At least one private subnet ID must be supplied for EKS node groups."
  }
}

###############################################################################
# Variable: cluster_name
# Purpose:
#   Defines a human-readable name for the EKS cluster, used for identification
#   in AWS console and for tagging/cost allocations.
# Specification from JSON:
#   - type: string
#   - description: "Name of the EKS cluster for TaskStream AI platform"
#   - validation: Ensures the name starts with a letter, followed by letters,
#                 digits, or hyphens, up to 100 characters.
###############################################################################
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster for TaskStream AI platform"

  validation {
    condition = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name)) && length(var.cluster_name) <= 100
    error_message = "Cluster name must start with a letter, contain only alphanumeric characters/hyphens, and be 100 characters or less."
  }
}

###############################################################################
# Variable: cluster_version
# Purpose:
#   Specifies the Kubernetes version for the EKS cluster, such as 1.27 or
#   1.26, etc. This helps define the matching control plane and node version.
# Specification from JSON:
#   - type: string
#   - description: "Kubernetes version for the EKS cluster"
#   - default: "1.27"
#   - validation: Must match "X.Y" numeric format.
###############################################################################
variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.27"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.cluster_version))
    error_message = "Cluster version must be in the format X.Y (e.g., 1.27)."
  }
}

###############################################################################
# Variable: node_groups
# Purpose:
#   Defines configuration for one or more EKS node groups, including desired
#   capacity, instance types, resource limits, taints, etc. This allows for
#   specialized node pools such as 'application', 'processing', or 'system'
#   grouping, each with unique scaling rules and instance specs.
# Specification from JSON:
#   - type: map(object({
#            desired_size: number,
#            max_size: number,
#            min_size: number,
#            instance_types: list(string),
#            capacity_type: string,
#            disk_size: number,
#            labels: map(string),
#            taints: list(object({key: string, value: string, effect: string})),
#            resource_limits: object({cpu: string, memory: string})
#        }))
#   - default: single "application" node group
###############################################################################
variable "node_groups" {
  type = map(
    object({
      desired_size    = number
      max_size        = number
      min_size        = number
      instance_types  = list(string)
      capacity_type   = string
      disk_size       = number
      labels          = map(string)
      taints          = list(
        object({
          key    = string
          value  = string
          effect = string
        })
      )
      resource_limits = object({
        cpu    = string
        memory = string
      })
    })
  )

  description = "Configuration for EKS node groups, including scaling policies, instance provisioning, and resource constraints."

  default = {
    application = {
      desired_size   = 5
      max_size       = 10
      min_size       = 3
      instance_types = ["t3.xlarge", "t3.2xlarge"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 100
      labels = {
        role        = "application"
        environment = "production"
      }
      taints = []
      resource_limits = {
        cpu    = "4"
        memory = "8Gi"
      }
    }
  }
}

###############################################################################
# Variable: cluster_addons
# Purpose:
#   Defines optional EKS cluster addons, such as the AWS VPC CNI, CoreDNS,
#   and kube-proxy. Allows version pinning and conflict resolution strategy.
# Specification from JSON:
#   - type: map(object({version: string, resolve_conflicts: string}))
#   - default: { vpc-cni = {...}, coredns = {...}, kube-proxy = {...} }
###############################################################################
variable "cluster_addons" {
  type = map(
    object({
      version          = string
      resolve_conflicts = string
    })
  )

  description = "Configuration map for EKS cluster addons, specifying version and conflict resolution."

  default = {
    vpc-cni = {
      version          = "v1.12.0"
      resolve_conflicts = "OVERWRITE"
    }
    coredns = {
      version          = "v1.9.3"
      resolve_conflicts = "OVERWRITE"
    }
    kube-proxy = {
      version          = "v1.27.1"
      resolve_conflicts = "OVERWRITE"
    }
  }
}

###############################################################################
# Variable: cluster_log_types
# Purpose:
#   Lists which control plane logs to enable for EKS. Common types include
#   'api', 'audit', 'authenticator', 'controllerManager', 'scheduler'.
# Specification from JSON:
#   - type: list(string)
#   - default: user-defined or typical set of EKS logs
###############################################################################
variable "cluster_log_types" {
  type        = list(string)
  description = "Types of control plane logs to enable for the EKS cluster (e.g., api, audit, authenticator)."

  # Example typical EKS logs to capture for operational and security insights
  default = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]
}

###############################################################################
# Variable: tags
# Purpose:
#   A map of tags inherited by EKS cluster and associated AWS resources, used
#   for cost allocation, environment demarcation, ownership identification,
#   and compliance with organizational tagging strategy.
# Specification from JSON:
#   - type: map(string)
#   - default: {}
###############################################################################
variable "tags" {
  type        = map(string)
  description = "Common resource tags for EKS cluster and its associated resources."
  default     = {}
}
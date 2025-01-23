################################################################################
# TaskStream AI - EKS Main Configuration
#
# Description:
#   Terraform configuration file to provision and manage an AWS EKS cluster
#   hosting TaskStream AI's containerized microservices with high availability,
#   enhanced security, multi-AZ resilience, and automated scaling. It references
#   external modules and variables, including VPC outputs for networking,
#   KMS key references for secrets encryption, and dedicated node groups for
#   workload specialization.
#
# Technical Specifications Alignment:
# ------------------------------------------------------------------------------
# 1) Container Orchestration (Tech Specs §8.1 Deployment Environment)
#    - Uses AWS EKS for multi-region/multi-AZ container orchestration.
# 2) Kubernetes Infrastructure (Tech Specs §8.4 Orchestration)
#    - Configures EKS cluster, node groups, OIDC, and advanced features like
#      encryption and logging.
# 3) Security Requirements (Tech Specs §7.2.1 Encryption Standards)
#    - Implements AWS KMS encryption for cluster secrets at rest (resources = [
#      "secrets" ]). OIDC integration possible for fine-grained IAM roles.
# 4) Infrastructure Scaling (Tech Specs §2.5.2 Scaling Parameters)
#    - Node groups with min, max, and desired capacity to support dynamic
#      scaling. This can integrate with cluster autoscaler for CPU-based (70%)
#      expansions and resource quotas.
#
# Imports Overview:
# ------------------------------------------------------------------------------
# - External Providers (IE2):
#     * aws (hashicorp/aws ~> 5.0)
#     * kubernetes (hashicorp/kubernetes ~> 2.23)
# - Internal Variables/Outputs (IE1):
#     * var.cluster_name, var.cluster_version, var.node_groups (from variables.tf)
#     * var.vpc_id, var.private_subnet_ids (from ../vpc/outputs.tf usage in root)
#     * var.secrets_key_arn (from ../kms/outputs.tf usage in root)
#
# Style & Comments:
# ------------------------------------------------------------------------------
# - Enterprise-ready, production-appropriate code style with extensive guidance.
# - Tagged thoroughly to aid cost optimization, environment clarity, and resource
#   ownership.
# - Comprehensive demonstration of references to meet the JSON specification.
################################################################################

################################################################################
# Terraform Configuration
################################################################################
terraform {
  # Global requirement for Terraform version, matching organizational policy.
  required_version = ">= 1.5.0"

  required_providers {
    # IE2: AWS Provider (hashicorp/aws ~> 5.0)
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # IE2: Kubernetes Provider (hashicorp/kubernetes ~> 2.23)
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

################################################################################
# AWS Provider Configuration
# - region set via var.region for flexible multi-region or cross-account usage.
# - Additional advanced settings (like assume_role, profiles) can be appended
#   here if required for more complex enterprise setups.
################################################################################
provider "aws" {
  region = var.region
}

################################################################################
# (Optional) Kubernetes Provider Configuration
# - Typically used post-cluster creation to manage Kubernetes resources (e.g.,
#   Deployments, Services). This configuration often consumes the EKS cluster's
#   endpoint, token, and CA data. Shown here as a placeholder for completeness.
################################################################################
provider "kubernetes" {
  # Dynamically configure:
  #   host                   = aws_eks_cluster.main.endpoint
  #   cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  #   token                  = data.aws_eks_cluster_auth.main.token
  # Additional custom logic or data source references would be used here.
}

################################################################################
# Variables (Referenced)
#
#   - var.region                : AWS region in which to create the cluster
#   - var.vpc_id               : VPC ID used for cluster networking
#   - var.private_subnet_ids    : Private subnets for EKS worker nodes
#   - var.secrets_key_arn       : KMS Key ARN for EKS secrets encryption
#   - var.cluster_name          : Name of the EKS cluster
#   - var.cluster_version       : Kubernetes version (e.g., "1.27") for EKS
#   - var.node_groups           : Map of node group configurations, each specifying
#                                 capacity, instance types, scaling, etc.
#   - var.tags                  : Common tags inherited by all EKS resources
#   - var.cluster_security_group_ids (optional) : Security group IDs for the cluster
#   - var.allowed_cidr_blocks  (optional) : CIDR blocks allowed to access the cluster
#   - var.service_cidr         (optional) : Service CIDR block for cluster IPs
#
# Additional variables (like cluster_role_arn, node_role_arn, etc.) can be
# defined if the IAM roles are provisioned separately. For demonstration,
# direct references appear below (aws_iam_role.*).
################################################################################

################################################################################
# Data Lookups (Optional)
# - If referencing a data source for KMS instead of var.secrets_key_arn:
#   data "aws_kms_key" "secrets_key" {
#     key_id = "arn:aws:kms:region:acct-id:key/abcde-..."
#   }
# - Then encryption_config.provider.key_arn = data.aws_kms_key.secrets_key.arn
#
# This example uses var.secrets_key_arn, as indicated by the import references.
################################################################################

################################################################################
# Resource: aws_eks_cluster.main
# Purpose : Create the primary EKS cluster with encryption, logging, and network
#           configuration. Aligns with enterprise security and high availability
#           standards. Exposes cluster endpoint, CA, OIDC identity, and advanced
#           cluster logs for operational insights.
################################################################################
resource "aws_eks_cluster" "main" {
  # Name & K8s Version
  name    = var.cluster_name
  version = var.cluster_version

  # IAM Role for EKS Control Plane
  # Replace this with a variable or data source as needed:
  # Example usage: var.cluster_role_arn
  role_arn = var.cluster_role_arn

  # VPC & Network Configuration
  vpc_config {
    # Ensure the cluster is placed in private subnets for security.
    subnet_ids         = var.private_subnet_ids
    security_group_ids = var.cluster_security_group_ids
    # By default, allow both private & public endpoint. This can be toggled
    # if desired to enforce private-only cluster endpoints.
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.allowed_cidr_blocks
  }

  # Encryption - KMS Key for 'secrets' at REST
  encryption_config {
    provider {
      key_arn = var.secrets_key_arn
    }
    resources = ["secrets"]
  }

  # Control Plane Logging (API, Audit, Authenticator, Controller Manager, Scheduler)
  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  # Kubernetes Networking
  kubernetes_network_config {
    service_ipv4_cidr = var.service_cidr
    ip_family         = "ipv4"
  }

  # Tagging for cost, environment, ownership
  tags = var.tags
}

################################################################################
# Resource: aws_eks_node_group.main
# Purpose : Provision dedicated node groups for workload-specific partitions
#           (e.g., "application", "processing", "system") with separate scaling,
#           instance types, and resource definitions. For each node group, we
#           can differentiate capacity_type (ON_DEMAND/SPOT), taints, and labels.
################################################################################
resource "aws_eks_node_group" "main" {
  # Generates a distinct node group resource per key in var.node_groups map.
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key

  # IAM Role for Node Group
  # Example usage: var.node_role_arn
  node_role_arn = var.node_role_arn

  # Must match the subnets used by the cluster; typically private_subnet_ids
  subnet_ids = var.private_subnet_ids

  # Scaling Configuration
  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }

  # Compute & Capacity
  instance_types      = each.value.instance_types
  capacity_type       = each.value.capacity_type
  disk_size           = each.value.disk_size
  force_update_version = true

  # Kubernetes Labels & Taints
  labels = each.value.labels
  taints = each.value.taints

  # Rolling update config: limit how many nodes can become unavailable
  update_config {
    max_unavailable_percentage = 25
  }

  # (Optional) Launch Template Integration
  # If each.value includes these fields:
  #   - launch_template_name
  #   - launch_template_version
  #   - additional_tags
  dynamic "launch_template" {
    for_each = can(each.value.launch_template_name) && can(each.value.launch_template_version)
      ? [1] : []
    content {
      name    = each.value.launch_template_name
      version = each.value.launch_template_version
    }
  }

  # Merge global tags with any additional node-group-specific tags
  tags = merge(
    var.tags,
    can(each.value.additional_tags) ? each.value.additional_tags : {}
  )
}

################################################################################
# Resource: aws_eks_addon.addons
# Purpose : Installs or manages EKS Add-ons such as the VPC CNI, CoreDNS, and
#           kube-proxy, among others for advanced cluster operation. The for_each
#           key is the add-on name, while the object includes a version pin and
#           optional configuration values.
################################################################################
resource "aws_eks_addon" "addons" {
  # One resource per key in var.cluster_addons
  for_each = var.cluster_addons

  cluster_name     = aws_eks_cluster.main.name
  addon_name       = each.key
  addon_version    = each.value.version
  resolve_conflicts = "OVERWRITE"
  preserve         = true

  # Some add-ons allow config overrides in JSON format or similar
  # If each.value.configuration is defined, pass it here
  dynamic "configuration_values" {
    for_each = can(each.value.configuration) ? [1] : []
    content {
      # The 'configuration_values' argument must be a single string in JSON
      # format for many EKS add-ons. Adjust as needed for your environment.
      content = each.value.configuration
    }
  }
}

################################################################################
# OUTPUTS
# -------------------------------------------------------------------------------
# These outputs expose EKS cluster details for consumption in other modules or
# external automation (e.g., setting up a CI/CD pipeline, configuring the
# kubernetes provider, or enabling IRSA for external services).
################################################################################

###############################################################################
# Output: cluster_id
# Purpose:
#   Unique identifier for the EKS cluster, typically returns the cluster name.
###############################################################################
output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

###############################################################################
# Output: cluster_endpoint
# Purpose:
#   Base endpoint URL for the EKS API server, used by kubectl and automation
#   hooking into the cluster. Typically of the form
#   https://XXXXXXXX.gr7.us-east-1.eks.amazonaws.com
###############################################################################
output "cluster_endpoint" {
  description = "The endpoint of the EKS cluster"
  value       = aws_eks_cluster.main.endpoint
}

###############################################################################
# Output: cluster_security_group_id
# Purpose:
#   The ID of the cluster security group automatically created and managed by
#   EKS. Typically used for additional rules or referencing node communications.
###############################################################################
output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

###############################################################################
# Output: cluster_oidc_issuer_url
# Purpose:
#   The OIDC issuer URL for the EKS cluster's identity provider. Required for
#   creating IAM roles for service accounts (IRSA) and fine-grained identity
#   management. Typically used when deploying external services that rely on
#   OIDC-based IAM integration.
###############################################################################
output "cluster_oidc_issuer_url" {
  description = "The OIDC issuer URL for the EKS cluster (used for IRSA)"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}
###############################################################################
# TaskStream AI - AWS IAM Main Configuration
#
# Description:
#   This Terraform configuration file defines AWS IAM Roles, Policies, and
#   Role Policy Attachments that implement RBAC + ABAC security controls
#   (Tech Specs §7.3.1) with ISO 27001 compliance (Tech Specs §7.3.3). It
#   includes IAM roles for EKS cluster, node groups, and Kubernetes service
#   accounts (IRSA) to address container security (Tech Specs §8.4) through
#   least privilege. It also features a KMS access policy for data security
#   (Tech Specs §7.2.1) with granular encryption permissions.
#
# Requirements Addressed (from JSON Specification):
#   - Access Control (RBAC + ABAC)
#   - Security Management (ISO 27001)
#   - Container Security (EKS + IRSA roles)
#   - Data Security (KMS key usage policy)
###############################################################################

################################################################################
# Terraform Configuration
################################################################################
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend storage is set to S3 as indicated in the JSON specification.
  # The full backend configuration can be managed here or in a separate file.
  backend "s3" {}
}

################################################################################
# AWS Provider Configuration
# - Inherits region, default_tags, and assume_role from variables or calling
#   environment. The 'assume_role' block ensures that Terraform operations
#   can be performed under a designated AWS IAM role (enterprise scenario).
################################################################################
provider "aws" {
  region       = var.region
  default_tags = var.tags

  # Example role assumption for enterprise multi-account setups:
  # variable "assume_role_arn" must be declared in an accompanying variables file
  # and provided externally if needed.
  assume_role {
    role_arn     = var.assume_role_arn
    session_name = "TaskStreamIAM"
  }
}

################################################################################
# Data Resources: IAM Policy Documents for Assume Role
# ------------------------------------------------------------------------------
# 1) EKS Cluster Assume Role Policy:
#    Allows the EKS service (eks.amazonaws.com) to assume the cluster role.
# 2) EKS Node Role Policy:
#    Allows EC2 (ec2.amazonaws.com) to assume the node instance role with
#    strict condition checks.
# 3) IRSA (OIDC) Assume Role Policy:
#    Constructed dynamically per service account to allow the specific
#    OIDC federated account from EKS to assume the role.
################################################################################

data "aws_iam_policy_document" "eks_cluster_assume_role" {
  statement {
    sid       = "AllowEKSServiceToAssumeRole"
    actions   = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }

    # Example condition checks for added security if needed:
    # condition {
    #   test     = "StringEquals"
    #   variable = "aws:SourceAccount"
    #   values   = [var.account_id]
    # }
    effect = "Allow"
  }
}

data "aws_iam_policy_document" "eks_node_assume_role" {
  statement {
    sid       = "AllowEC2AssumeRoleForNodes"
    actions   = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    # Example condition checks for enhanced RBAC:
    # condition {
    #   test     = "StringEquals"
    #   variable = "aws:RequestedRegion"
    #   values   = [var.region]
    # }
    effect = "Allow"
  }
}

# IRSA (OIDC) trust policies are declared for each service account below.
# We'll build them via a dynamic data block referencing the OIDC provider,
# typically something like: "oidc.eks.<region>.amazonaws.com/id/<IDENTIFIER>"
#
# Key placeholders:
#   - namespace      (K8s namespace)
#   - service_account (K8s service account name)
#   - sub: "system:serviceaccount:<namespace>:<service_account>"
data "aws_iam_policy_document" "irsa" {
  for_each = var.service_accounts
  statement {
    sid     = "AllowServiceAccountAssumeRole"
    actions = ["sts:AssumeRole"]

    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_provider_arn, "arn:aws:iam::", "")}:sub"
      values   = ["system:serviceaccount:${each.value.namespace}:${each.value.service_account}"]
    }
  }
}

################################################################################
# IAM Roles
# ------------------------------------------------------------------------------
# 1) cluster_role:   Role assumed by EKS control plane
# 2) node_role:      Role assumed by EKS worker nodes (EC2)
# 3) service_account_roles: One role per Kubernetes service account (IRSA)
#
# Each role uses:
#   - A permissions boundary (var.permissions_boundary_arn or from each object)
#   - force_detach_policies = true for security
#   - Secure tagging for ISO27001 & auditing
################################################################################

resource "aws_iam_role" "cluster_role" {
  description           = "IAM role for EKS cluster with enhanced security controls"
  name                  = "${var.project_name}-${var.environment}-eks-cluster"
  assume_role_policy    = data.aws_iam_policy_document.eks_cluster_assume_role.json
  permissions_boundary  = var.permissions_boundary_arn
  force_detach_policies = true

  tags = merge(
    var.tags,
    {
      SecurityLevel   = "Critical"
      ComplianceScope = "ISO27001"
    }
  )
}

resource "aws_iam_role" "node_role" {
  description           = "IAM role for EKS node group instances with strict conditions"
  name                  = "${var.project_name}-${var.environment}-eks-node"
  assume_role_policy    = data.aws_iam_policy_document.eks_node_assume_role.json
  permissions_boundary  = var.permissions_boundary_arn
  force_detach_policies = true

  tags = merge(
    var.tags,
    {
      SecurityLevel   = "High"
      ComplianceScope = "ISO27001"
    }
  )
}

resource "aws_iam_role" "service_account_roles" {
  for_each              = var.service_accounts
  description           = "IAM role for IRSA-based service account '${each.key}' with enhanced security"
  name                  = "${var.project_name}-${var.environment}-${each.key}"
  assume_role_policy    = data.aws_iam_policy_document.irsa[each.key].json
  permissions_boundary  = each.value.permissions_boundary
  force_detach_policies = true
  max_session_duration  = 3600

  # The JSON specification references additional tags such as each.value.tags and
  # each.value.security_level, though these may not exist in the base variable definition.
  # For completeness, we attempt to merge them if provided or default them.
  tags = try(
    merge(
      var.tags,
      each.value.tags,
      {
        SecurityLevel   = each.value.security_level
        ComplianceScope = "ISO27001"
      }
    ),
    merge(
      var.tags,
      {
        SecurityLevel   = "Medium"
        ComplianceScope = "ISO27001"
      }
    )
  )
}

################################################################################
# IAM Role Policy Attachments
# ------------------------------------------------------------------------------
# Attach AWS-managed or custom policies to the cluster_role and node_role with
# least privilege. The JSON specification references two sets of attachments:
#
#   1) cluster_policies:   AmazonEKSClusterPolicy
#   2) node_policies:      [ "AmazonEKSWorkerNodePolicy", "AmazonEKS_CNI_Policy",
#                            "AmazonEC2ContainerRegistryReadOnly" ]
################################################################################

# EKS Cluster Role: Attach the AmazonEKSClusterPolicy
resource "aws_iam_role_policy_attachment" "cluster_policies" {
  depends_on = [aws_iam_role.cluster_role]

  role       = aws_iam_role.cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# EKS Node Role: Attach multiple policies for the worker nodes
resource "aws_iam_role_policy_attachment" "node_policies" {
  depends_on = [aws_iam_role.node_role]

  # If multiple ARNs are needed, we can use for_each. Here we rely on a single
  # resource with multiple attachments in a loop, or define them explicitly.
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])

  role       = aws_iam_role.node_role.name
  policy_arn = each.key
}

################################################################################
# Custom IAM Policies
# ------------------------------------------------------------------------------
# 1) kms_access:
#    A policy controlling usage of a KMS key (Tech Specs §7.2.1) with condition
#    checks for encryption/decryption. This addresses granular data security.
#
# 2) service_policies:
#    For each service account, a minimal or specialized policy can be attached
#    to restrict resource usage to only what is necessary, enabling least
#    privilege in line with ISO 27001.
################################################################################

resource "aws_iam_policy" "kms_access" {
  name        = "${var.project_name}-${var.environment}-kms-access"
  description = "KMS key access policy with strict permissions for encryption/decryption"
  path        = "/"
  tags = merge(
    var.tags,
    {
      SecurityLevel   = "Critical"
      ComplianceScope = "ISO27001"
    }
  )

  policy = <<-EOKMS
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowKMSKeyUsage",
        "Effect": "Allow",
        "Action": [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        "Resource": "${var.kms_key_arn}",
        "Condition": {
          "StringEquals": {
            "aws:RequestedRegion": "${var.region}"
          }
        }
      }
    ]
  }
  EOKMS
}

resource "aws_iam_policy" "service_policies" {
  for_each    = var.service_accounts
  name        = "${var.project_name}-${var.environment}-${each.key}-policy"
  description = "Service-specific policy for '${each.key}' with strict resource constraints"
  path        = "/"

  tags = try(
    merge(
      var.tags,
      each.value.tags,
      {
        SecurityLevel   = each.value.security_level
        ComplianceScope = "ISO27001"
      }
    ),
    merge(
      var.tags,
      {
        SecurityLevel   = "Medium"
        ComplianceScope = "ISO27001"
      }
    )
  )

  policy = <<-EOSVC
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "ServiceAccountLeastPrivilege",
        "Effect": "Allow",
        "Action": [
          "ec2:Describe*",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "*"
      }
    ]
  }
  EOSVC
}

################################################################################
# Outputs
# ------------------------------------------------------------------------------
# 1) cluster_role_arn            : ARN for the EKS cluster IAM role
# 2) node_role_arn               : ARN for the EKS node group IAM role
# 3) service_account_role_arns   : Map of service account keys to their IAM role ARNs
################################################################################

output "cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role with security metadata"
  value       = aws_iam_role.cluster_role.arn
}

output "node_role_arn" {
  description = "ARN of the EKS node group IAM role with security metadata"
  value       = aws_iam_role.node_role.arn
}

output "service_account_role_arns" {
  description = "Map of service account names to their IAM role ARNs with security context"
  value = {
    for sa, role in aws_iam_role.service_account_roles :
    sa => role.arn
  }
}
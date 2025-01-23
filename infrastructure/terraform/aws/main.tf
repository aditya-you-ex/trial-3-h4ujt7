###############################################################################
# TaskStream AI - Root Terraform Configuration
#
# Description:
#   This file orchestrates the AWS infrastructure deployment for the
#   TaskStream AI platform, applying multi-region design principles,
#   robust security controls (KMS, IAM, private networking), and enterprise
#   standards for scalability. Based on the technical specifications, it
#   provisions foundational resources such as KMS for encryption, a secure
#   VPC (multi-AZ), an EKS cluster for containerized workloads, and an RDS
#   Aurora cluster for relational data.
#
# Requirements Addressed:
#   1) Multi-Region Deployment (Tech Spec 8.1)
#      - Mechanisms for multi-AZ networking, planning for cross-region
#        replication, and distributing subnets.
#   2) Cloud Infrastructure (Tech Spec 8.2)
#      - Orchestrates AWS core services such as EKS, RDS, and secure
#        networking with appropriate subnets and encryption.
#   3) Security Architecture (Tech Spec 7)
#      - Incorporates KMS-based encryption, security groups, and restricted
#        subnet design. Private subnets for core services. Audit logging,
#        flow logs, and encryption at rest are enabled selectively.
#
# Style & Comments:
#   - Employing enterprise-ready practices and in-code documentation to
#     promote clarity, maintainability, and compliance.
###############################################################################


###############################################################################
# Specify Required Terraform Version and Provider Constraints
###############################################################################
terraform {
  required_version = ">= 1.0.0"

  # Providers used by this configuration. The AWS provider is pinned to a
  # major version family. Additional providers can be added if needed by
  # other modules (e.g., Helm, random, local).
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # IE2: Constraining AWS provider to v5.x
    }
  }
}


###############################################################################
# AWS Provider Configuration
#
# This block can be further customized for multi-region or multi-account
# deployments, specifying profiles and assuming roles where needed. The
# primary region is typically set via var.aws_region.
###############################################################################
provider "aws" {
  region = var.aws_region
}


###############################################################################
# Local Values
#
# These locals consolidate frequently used expressions and merges for
# consistent tagging, environment references, and security configurations:
#
#   - environment: The deployment environment (e.g., development, staging,
#                  production).
#   - region:      AWS region from var.aws_region.
#   - common_tags: A merged set of resource tags (var.tags + mandatory keys).
#   - kms_config:  Config object for the KMS platform (deletion window,
#                  key rotation, multi-region).
###############################################################################
locals {
  environment = var.environment
  region      = var.aws_region

  # Generally merges default or user-provided tags (var.tags) with additional
  # standard tags required for compliance and accountability.
  common_tags = merge(
    var.tags,
    {
      Environment      = var.environment
      Project          = var.project
      ManagedBy        = "terraform"
      # The following fields can be included if suitable variables exist:
      # SecurityLevel    = var.security_level
      # ComplianceScope  = var.compliance_scope
    }
  )

  # Example KMS configuration for comprehensive encryption:
  #   - 7-day deletion window
  #   - Automatic key rotation
  #   - Multi-region key usage
  kms_config = {
    deletion_window       = 7
    enable_key_rotation   = true
    multi_region          = true
  }
}


###############################################################################
# KMS Module
#
# This module is responsible for creating and managing a KMS Customer
# Managed Key (CMK) for TaskStream AI. It secures data at rest for
# RDS, EKS secrets, and other AWS services. The local.kms_config
# object drives various encryption settings.
###############################################################################
module "kms" {
  source              = "./kms"
  key_name            = "${var.project}-${var.environment}"
  deletion_window     = local.kms_config.deletion_window
  enable_key_rotation = local.kms_config.enable_key_rotation
  multi_region        = local.kms_config.multi_region
  tags                = local.common_tags
}


###############################################################################
# VPC Module
#
# Provisions a multi-AZ VPC with public, private, and database subnets.
# Flow logs are enabled for auditing and key security insights. The
# subnets are automatically spread across the AZs defined in var.availability_zones.
###############################################################################
module "vpc" {
  source             = "./vpc"
  project            = var.project
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones

  # Enabling flow logs for network monitoring and setting a 30-day log retention
  enable_flow_logs    = true
  flow_logs_retention = 30

  tags = local.common_tags
}


###############################################################################
# EKS Module
#
# Deploys an Elastic Kubernetes Service (EKS) cluster for containerized
# workloads. Integrates with the KMS module for envelope encryption of
# secrets. Places worker nodes in private subnets for security.
###############################################################################
module "eks" {
  source               = "./eks"
  cluster_name         = "${var.project}-${var.environment}"
  cluster_version      = var.eks_cluster_version
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnets
  node_groups          = var.eks_node_groups
  kms_key_id           = module.kms.key_id
  enable_encryption    = true
  enable_audit_logging = true
  tags                 = local.common_tags
}


###############################################################################
# RDS Module
#
# Creates an Aurora PostgreSQL cluster. It references the KMS CMK for
# encryption at rest. Deployed within the VPC's database subnets and
# configured for robust auditing, performance insights, and backups.
###############################################################################
module "rds" {
  source                     = "./rds"
  identifier                 = "${var.project}-${var.environment}"
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.database_subnets
  cluster_config             = var.rds_cluster_config
  kms_key_id                 = module.kms.key_id
  enable_performance_insights = true
  backup_retention_period     = 30
  enable_audit_logging        = true
  tags                        = local.common_tags
}


###############################################################################
# OUTPUTS
#
# These outputs expose essential infrastructure details so that other
# applications or modules can reference them, facilitating cross-team
# collaboration, automated pipeline workflows, and integration with
# external systems.
###############################################################################

###############################################################################
# Output: vpc_id
# Purpose:
#   Surfaces the newly created VPC ID for operators or modules that need
#   to attach resources (e.g., security groups, additional subnets) to
#   the same VPC.
###############################################################################
output "vpc_id" {
  description = "Exposes created VPC ID"
  value       = module.vpc.vpc_id
}

###############################################################################
# Output: eks_cluster_endpoint
# Purpose:
#   Provides the EKS cluster endpoint for kubectl or other Kubernetes
#   management tools. Automation pipelines rely on this endpoint to
#   configure contexts and deploy workloads.
###############################################################################
output "eks_cluster_endpoint" {
  description = "Exposes EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

###############################################################################
# Output: rds_cluster_endpoint
# Purpose:
#   Exposes the primary endpoint for the Aurora cluster, enabling
#   application services or external scripts to connect to the database.
###############################################################################
output "rds_cluster_endpoint" {
  description = "Exposes RDS cluster endpoint"
  value       = module.rds.cluster_endpoint
}
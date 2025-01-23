###############################################################################
# TaskStream AI - Root Terraform Outputs
#
# Description:
#   Root-level Terraform outputs file that aggregates and exposes critical
#   infrastructure information from all AWS service modules, including EKS,
#   RDS, and ElastiCache. This file implements multi-region AWS deployment
#   considerations, global scalability, and security controls around
#   sensitive infrastructure data, aligning with SOC2/GDPR requirements.
#
# References to Imported Modules (IE1):
#   - module.eks_outputs:
#       cluster_id (string)
#       cluster_endpoint (string)
#       cluster_certificate_authority_data (string)
#   - module.rds_outputs:
#       cluster_endpoint (string)
#       reader_endpoint (string)
#       port (number)
#   - module.elasticache_outputs:
#       redis_endpoint (string)
#       redis_port (number)
#
# External Provider (IE2):
#   - AWS Provider (hashicorp/aws ~> 5.0), used here for resource references
#
# Global Specifications:
#   - Terraform required_version >= 1.5.0
#   - Validation rules for endpoint format stored under local.validation_rules
#
# Exports:
#   1) eks_cluster_id
#   2) eks_cluster_endpoint
#   3) database_endpoints
#   4) redis_configuration
#
# Security Classification: restricted
# Compliance Requirements: SOC2, GDPR
###############################################################################

###############################################################################
# Terraform Configuration
# - Ensures alignments with version and AWS provider usage
###############################################################################
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"  # v~> 5.0
      version = "~> 5.0"
    }
  }
}

###############################################################################
# Locals
# - Establishes centralized validation rules or common metadata
###############################################################################
locals {
  # Regex pattern ensures a matching host:port format, e.g., "example.us-east-1.elb.amazonaws.com:443"
  validation_rules = {
    endpoint_format = "^[a-zA-Z0-9\\.\\-]+\\.[a-zA-Z0-9\\.\\-]+:[0-9]+$"
  }
}

###############################################################################
# Module Imports for Internal Outputs (IE1)
# - Aggregates outputs from submodules for EKS, RDS, and ElastiCache
###############################################################################
module "eks_outputs" {
  # The relative path to the EKS module that exports cluster_id, cluster_endpoint, etc.
  source = "./eks"
}

module "rds_outputs" {
  # The relative path to the RDS module that exports cluster_endpoint, reader_endpoint, port, etc.
  source = "./rds"
}

module "elasticache_outputs" {
  # The relative path to the ElastiCache module that exports redis_endpoint, redis_port, etc.
  source = "./elasticache"
}

###############################################################################
# Output: eks_cluster_id
# Purpose:
#   Exposes the EKS cluster identifier to external consumers or modules.
#   This ID is typically used for referencing the cluster in automation,
#   logging, CI/CD, or advanced orchestration tasks. Marked as non-sensitive
#   because it excludes credentials or private details.
###############################################################################
output "eks_cluster_id" {
  description = "Unique identifier for the EKS cluster (non-sensitive)."
  value       = module.eks_outputs.cluster_id
  sensitive   = false
}

###############################################################################
# Output: eks_cluster_endpoint
# Purpose:
#   Exposes the API server endpoint for the EKS cluster, enabling secure
#   communication with Kubernetes workloads. This output includes a
#   precondition validating it matches an expected host:port format.
###############################################################################
output "eks_cluster_endpoint" {
  description = "The EKS cluster API server endpoint, validated against host:port format."
  value       = module.eks_outputs.cluster_endpoint
  sensitive   = false

  # Precondition block ensures endpoint correctness and references local regex rules
  precondition {
    condition     = can(regex(local.validation_rules.endpoint_format, module.eks_outputs.cluster_endpoint))
    error_message = "EKS cluster endpoint does not match the required host:port pattern."
  }
}

###############################################################################
# Output: database_endpoints
# Purpose:
#   Aggregates critical RDS endpoint information into a map, including the
#   writer endpoint, reader endpoint, and port. This consolidated output
#   ensures consistent references for microservices or external modules
#   needing read/write database access, while validating them for format
#   and numeric correctness.
###############################################################################
output "database_endpoints" {
  description = "Map of RDS database endpoints (writer, reader, port), subject to verification."
  sensitive   = false

  value = {
    writer = module.rds_outputs.cluster_endpoint
    reader = module.rds_outputs.reader_endpoint
    port   = tostring(module.rds_outputs.port)
  }

  # Precondition checks ensure the RDS endpoints match the host:port pattern
  # and that the port is within a valid numeric range.
  precondition {
    condition = (
      can(regex(local.validation_rules.endpoint_format, module.rds_outputs.cluster_endpoint)) &&
      can(regex(local.validation_rules.endpoint_format, module.rds_outputs.reader_endpoint)) &&
      module.rds_outputs.port > 0 && module.rds_outputs.port < 65536
    )
    error_message = "Invalid RDS cluster endpoints or port (must match host:port, with port in 1..65535)."
  }
}

###############################################################################
# Output: redis_configuration
# Purpose:
#   Consolidates Redis endpoint and port into a secure map for easy consumption
#   by downstream services requiring access to the ElastiCache cluster. Includes
#   precondition checks for format and port validity to enforce data security
#   and correctness.
###############################################################################
output "redis_configuration" {
  description = "Map of Redis endpoint and port for ElastiCache cluster communication."
  sensitive   = false

  value = {
    endpoint = module.elasticache_outputs.redis_endpoint
    port     = tostring(module.elasticache_outputs.redis_port)
  }

  # Precondition ensures the endpoint:port pair follows the defined pattern
  precondition {
    condition = can(regex(
      local.validation_rules.endpoint_format,
      format("%s:%d", module.elasticache_outputs.redis_endpoint, module.elasticache_outputs.redis_port)
    ))
    error_message = "Invalid Redis endpoint or port does not match the required host:port pattern."
  }
}
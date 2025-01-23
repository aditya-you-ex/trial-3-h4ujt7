###############################################################################
# TaskStream AI - ElastiCache Redis Variables
#
# Description:
#   This Terraform variables file defines all required and optional
#   parameters needed to provision an AWS ElastiCache for Redis cluster
#   within the TaskStream AI platform. The variables align with the
#   multi-AZ, high availability, and encryption requirements specified
#   in the system architecture.
#
# Requirements Addressed (LD2):
#   - Redis 7.0+ cluster mode
#   - High availability with multi-AZ
#   - Encryption in transit and at rest
#
# External Import (IE2):
#   - hashicorp/terraform v~> 1.5
#     Core Terraform functionality for variable definitions
#
# Style & Comments (S1 & S2):
#   - Enterprise-ready, production-appropriate coding style
#   - Extensive comments and validation for clarity
###############################################################################

###############################################################################
# Variable: environment
# Purpose:
#   Defines the environment name for resource naming, tagging, and
#   organizational clarity. Must be one of "development", "staging",
#   or "production".
###############################################################################
variable "environment" {
  type        = string
  description = "Environment name for resource naming and tagging (development, staging, production)."
  default     = "development"

  validation {
    condition     = can(regex("^(development|staging|production)$", var.environment))
    error_message = "Environment must be one of: development, staging, production"
  }
}

###############################################################################
# Variable: vpc_id
# Purpose:
#   The ID of the VPC where ElastiCache will be deployed. Must match a
#   valid VPC ID that typically starts with 'vpc-'. This variable is
#   imported from the VPC module outputs.tf (IE1) and is critical for
#   ensuring the Redis cluster resides inside the correct VPC.
###############################################################################
variable "vpc_id" {
  type        = string
  description = "ID of the VPC where ElastiCache will be deployed."

  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must be valid and start with 'vpc-'"
  }
}

###############################################################################
# Variable: subnet_ids
# Purpose:
#   List of subnet IDs in which to deploy the ElastiCache subnet group.
#   For high availability, at least two subnets spanning multiple
#   Availability Zones are recommended.
###############################################################################
variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for ElastiCache subnet group."

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnets must be provided for high availability."
  }
}

###############################################################################
# Variable: node_type
# Purpose:
#   The AWS ElastiCache node instance type to be used for each cache
#   node in the Redis cluster. Must correspond to a valid cluster-
#   compatible AWS instance class, such as cache.t4g.*, cache.r6g.*,
#   or cache.m6g.*.
###############################################################################
variable "node_type" {
  type        = string
  description = "ElastiCache node instance type (e.g., cache.t4g.medium)."
  default     = "cache.t4g.medium"

  validation {
    condition     = can(regex("^cache\\.(t4g|r6g|m6g)\\.", var.node_type))
    error_message = "Node type must be a valid ElastiCache instance type (t4g, r6g, or m6g)."
  }
}

###############################################################################
# Variable: num_cache_clusters
# Purpose:
#   The total number of cache replicas plus primary required in the
#   cluster. A minimum of two ensures at least one replica is used
#   for high availability in production scenarios.
###############################################################################
variable "num_cache_clusters" {
  type        = number
  description = "Number of cache clusters (primary + replicas)."
  default     = 3

  validation {
    condition     = var.num_cache_clusters >= 2 && var.num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 2 and 6."
  }
}

###############################################################################
# Variable: port
# Purpose:
#   The port on which the Redis service will listen. Default is 6379,
#   which is standard for Redis, but can be customized to meet
#   organizational policies.
###############################################################################
variable "port" {
  type        = number
  description = "Port number for Redis connections."
  default     = 6379

  validation {
    condition     = var.port > 0 && var.port < 65536
    error_message = "Port must be between 1 and 65535."
  }
}

###############################################################################
# Variable: parameter_family
# Purpose:
#   Specifies the ElastiCache parameter group family. Must be a valid
#   Redis version identifier that meets or exceeds 7.0. This variable
#   aligns with the requirement for Redis 7.0+.
###############################################################################
variable "parameter_family" {
  type        = string
  description = "ElastiCache parameter group family (e.g., redis7.0)."
  default     = "redis7.0"

  validation {
    condition     = can(regex("^redis7\\.0", var.parameter_family))
    error_message = "Parameter family must be redis7.0 or higher."
  }
}

###############################################################################
# Variable: automatic_failover_enabled
# Purpose:
#   Boolean flag to enable automatic failover for the Redis cluster,
#   promoting a replica node to primary in the event of a failure.
###############################################################################
variable "automatic_failover_enabled" {
  type        = bool
  description = "Enable automatic failover for Redis cluster."
  default     = true
}

###############################################################################
# Variable: multi_az_enabled
# Purpose:
#   Boolean flag to enable multi-AZ for ElastiCache. This ensures
#   that nodes are deployed across multiple Availability Zones to
#   minimize downtime.
###############################################################################
variable "multi_az_enabled" {
  type        = bool
  description = "Enable Multi-AZ deployment for Redis cluster."
  default     = true
}

###############################################################################
# Variable: at_rest_encryption_enabled
# Purpose:
#   Boolean flag to enable encryption at rest for the Redis cluster,
#   meeting data security compliance requirements by preventing raw
#   data from being accessible on underlying storage.
###############################################################################
variable "at_rest_encryption_enabled" {
  type        = bool
  description = "Enable encryption at rest for Redis cluster."
  default     = true
}

###############################################################################
# Variable: transit_encryption_enabled
# Purpose:
#   Boolean flag to enable in-transit (TLS) encryption for connections
#   between clients and the Redis cluster, securing data flow within
#   the network.
###############################################################################
variable "transit_encryption_enabled" {
  type        = bool
  description = "Enable encryption in transit for Redis cluster."
  default     = true
}

###############################################################################
# Variable: allowed_cidr_blocks
# Purpose:
#   Provides a list of CIDR blocks that can directly access the Redis
#   cluster, typically used when controlling inbound access outside of
#   SG-based rules. All CIDRs must be valid.
###############################################################################
variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "List of CIDR blocks allowed to access Redis cluster."
  default     = []

  validation {
    condition = alltrue(
      [
        for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))
      ]
    )
    error_message = "All CIDR blocks must be valid."
  }
}

###############################################################################
# Variable: maintenance_window
# Purpose:
#   Specifies the weekly time range (in UTC) during which system
#   maintenance may occur. Uses standard AWS ElastiCache maintenance
#   window format: day:HH:MM-day:HH:MM.
###############################################################################
variable "maintenance_window" {
  type        = string
  description = "Weekly time range for maintenance operations."
  default     = "sun:05:00-sun:09:00"

  validation {
    condition = can(
      regex(
        "^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$",
        var.maintenance_window
      )
    )
    error_message = "Maintenance window must be in the format day:HH:MM-day:HH:MM."
  }
}

###############################################################################
# Variable: snapshot_retention_limit
# Purpose:
#   Defines how many days of automatic snapshots will be retained
#   for backup and point-in-time recovery. Ranges from 0 to 35.
###############################################################################
variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain automatic snapshots."
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 0 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 0 and 35 days."
  }
}

###############################################################################
# Variable: tags
# Purpose:
#   A map of tags to assign to ElastiCache resources (e.g., cost
#   accounting, environment context, or resource ownership). Follows
#   enterprise tagging standards for better governance.
###############################################################################
variable "tags" {
  type        = map(string)
  description = "Additional tags for ElastiCache resources."
  default     = {}
}
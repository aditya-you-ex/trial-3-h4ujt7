####################################################################################################
# This variables definition file provides a production-grade, enterprise-level Terraform configuration
# for creating and managing an AWS RDS Aurora PostgreSQL cluster. It aligns with the following
# technical specification requirements:
#
# 1) Primary Database Configuration (Tech Spec 4.3.1): Ensures PostgreSQL 14+ compatibility and
#    allows horizontal scaling with read replicas.
# 2) Data Security (Tech Spec 7.2.1): Encourages AES-256-GCM encryption at rest using AWS KMS.
# 3) High Availability (Tech Spec 8.1): Facilitates multi-AZ deployment with cross-region failover.
#
# External Dependency:
#   - Terraform (hashicorp/terraform) version ~> 1.5
#     Required for advanced variable validation and type constraints.
####################################################################################################

################################################################################
# Unique identifier for the Aurora PostgreSQL cluster. Must comply with
# naming rules: only lowercase alphanumeric and hyphens. This aligns with
# best practices for resource naming consistency in AWS.
################################################################################
variable "cluster_identifier" {
  type        = string
  description = "Unique identifier for the RDS Aurora cluster"

  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.cluster_identifier))
    error_message = "Cluster identifier must contain only lowercase alphanumeric characters and hyphens."
  }
}

################################################################################
# Aurora PostgreSQL engine version. It must match the PostgreSQL 14.x series
# as specified in the technical requirements (PostgreSQL 14+).
################################################################################
variable "engine_version" {
  type        = string
  description = "Aurora PostgreSQL engine version"
  default     = "14.9"

  validation {
    condition     = can(regex("^14\\.[0-9]+$", var.engine_version))
    error_message = "Engine version must be PostgreSQL 14.x"
  }
}

################################################################################
# Initial database name to create within the Aurora cluster. Must start with
# a letter and can only contain alphanumeric characters or underscores.
################################################################################
variable "database_name" {
  type        = string
  description = "Name of the initial database to be created"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.database_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores."
  }
}

################################################################################
# Master username for the Aurora cluster. Must also start with a letter and
# only contain alphanumeric characters or underscores. Implements a standard pattern
# for admin-level database usernames.
################################################################################
variable "master_username" {
  type        = string
  description = "Master username for the RDS cluster"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.master_username))
    error_message = "Master username must start with a letter and contain only alphanumeric characters and underscores."
  }
}

################################################################################
# Instance class to be used for each Aurora DB instance. Must match a list of
# valid instance types for Aurora PostgreSQL. By default, we use 'db.r6g.xlarge'
# for memory and compute performance.
################################################################################
variable "instance_class" {
  type        = string
  description = "Instance class for RDS cluster instances"
  default     = "db.r6g.xlarge"

  validation {
    condition = can(
      regex("^db\\.(r6g|r6gd|r5)\\.(large|xlarge|2xlarge|4xlarge|8xlarge|16xlarge)$", var.instance_class)
    )
    error_message = "Instance class must be a valid Aurora PostgreSQL instance type"
  }
}

################################################################################
# Number of read replicas to create, which also facilitates high availability
# and horizontal scalability. The technical specifications specify multi-AZ
# scaling with up to 15 replicas.
################################################################################
variable "replica_count" {
  type        = number
  description = "Number of read replicas to create"
  default     = 2

  validation {
    condition     = var.replica_count >= 1 && var.replica_count <= 15
    error_message = "Replica count must be between 1 and 15"
  }
}

################################################################################
# Automated backup retention period in days. By default, backups are retained
# for 35 days, supporting extended recovery objectives. Must be between 35 and 90
# to remain in compliance with enterprise data retention policies.
################################################################################
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 35

  validation {
    condition     = var.backup_retention_period >= 35 && var.backup_retention_period <= 90
    error_message = "Backup retention period must be between 35 and 90 days"
  }
}

################################################################################
# Preferred daily backup window in UTC, ensuring backups occur during off-peak
# times. Must follow the format HH:MM-HH:MM, validated by regex. Default is
# 03:00-04:00 for minimal user impact.
################################################################################
variable "preferred_backup_window" {
  type        = string
  description = "Daily time range during which automated backups are created"
  default     = "03:00-04:00"

  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.preferred_backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM"
  }
}

################################################################################
# Weekly maintenance window, scheduled by day and time range. Must follow
# ddd:hh:mm-ddd:hh:mm, validated by regex. Default is sun:04:00-sun:05:00.
################################################################################
variable "preferred_maintenance_window" {
  type        = string
  description = "Weekly time range during which system maintenance can occur"
  default     = "sun:04:00-sun:05:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-5][0-9]:[0-5][0-9]-[a-z]{3}:[0-5][0-5]:[0-5][0-9]$", var.preferred_maintenance_window))
    error_message = "Maintenance window must be in format ddd:hh:mm-ddd:hh:mm"
  }
}

################################################################################
# A map of tags to be applied to all RDS resources, ensuring consistent resource
# labeling across AWS. Defaults align with standard tagging conventions for
# environment identification, project context, and administrative tracking.
################################################################################
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all RDS resources"
  default = {
    Environment = "production"
    Project     = "taskstream"
    ManagedBy   = "terraform"
  }
}
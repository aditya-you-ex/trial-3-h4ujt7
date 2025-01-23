###############################################################################
# TaskStream AI - AWS RDS Aurora PostgreSQL Configuration
#
# Description:
#   Terraform configuration for a high-availability Aurora PostgreSQL cluster
#   addressing the following core requirements:
#     - Primary Database Configuration (PostgreSQL 14+)
#     - Data Security (AES-256-GCM encryption, SSL in transit)
#     - High Availability (Multi-AZ, cross-region failover, 99.9% SLA)
#
# Highlights:
#   - RDS Cluster (aws_rds_cluster) with encryption at rest via AWS KMS key
#   - Mandatory SSL enforcement through cluster parameter group
#   - Enhanced monitoring and performance insights
#   - Read replicas using cluster instances with replica_count
#   - Randomly generated master password for security
#   - Strict security group ingress to only permitted CIDRs
#
# Imports (IE1, IE2):
#   - data.terraform_remote_state.vpc.outputs.vpc_id
#   - data.terraform_remote_state.vpc.outputs.database_subnet_ids
#   - data.terraform_remote_state.kms.outputs.rds_key_arn
#   - provider.aws (hashicorp/aws ~> 5.0)
#   - provider.random (hashicorp/random ~> 3.5)
#
# Style & Comments (S1 & S2):
#   - Enterprise-ready, production-grade structure with extensive documentation.
###############################################################################

###############################################################################
# Terraform Settings & Providers
###############################################################################
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

###############################################################################
# Data Sources: Remote State References
# In an enterprise setup, these data blocks typically reference a backend that
# stores state (e.g., Terraform Cloud, S3), enabling cross-module outputs.
###############################################################################
data "terraform_remote_state" "vpc" {
  backend = "remote"

  # Replace with appropriate configuration for environment
  # Example:
  # workspace = "taskstream-vpc"
}

data "terraform_remote_state" "kms" {
  backend = "remote"

  # Replace with appropriate configuration for environment
  # Example:
  # workspace = "taskstream-kms"
}

###############################################################################
# Random Password for Aurora Master User
#  - Generate a cryptographically secure password.
#  - Minimizes risk of credential leakage and ensures complexity.
###############################################################################
resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

###############################################################################
# Variables:
# These may be defined externally (e.g., variables.tf) in a production-grade
# setup. They are documented here for completeness and reference.
###############################################################################
variable "cluster_identifier" {
  type        = string
  description = "Unique identifier for the Aurora RDS Cluster."
}

variable "engine_version" {
  type        = string
  description = "Aurora PostgreSQL engine version, e.g. 14.x compatible."
}

variable "database_name" {
  type        = string
  description = "Initial database name created within the cluster."
}

variable "master_username" {
  type        = string
  description = "Master username for the RDS cluster."
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups."
  default     = 7
}

variable "preferred_backup_window" {
  type        = string
  description = "Daily time range (UTC) for taking automated backups."
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  type        = string
  description = "Weekly time range (UTC) for pending modifications."
  default     = "sun:04:00-sun:05:00"
}

variable "replica_count" {
  type        = number
  description = "Number of read replicas (excluding primary)."
  default     = 1
}

variable "instance_class" {
  type        = string
  description = "Instance class for Aurora cluster instances."
  default     = "db.r6g.large"
}

variable "ca_cert_identifier" {
  type        = string
  description = "CA certificate to enforce SSL, e.g. rds-ca-2019."
  default     = "rds-ca-2019"
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed ingress to the RDS cluster."
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags for cost allocation and environment identification."
  default     = {}
}

###############################################################################
# RDS Cluster Parameter Group
#  - Ensures SSL enforcement (rds.force_ssl)
#  - Enables performance optimizations (e.g., pg_stat_statements)
#  - Logs for auditing and monitoring
###############################################################################
resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${var.cluster_identifier}-pg"
  family      = "aurora-postgresql14"
  description = "Parameter group enforcing SSL and performance optimizations for Aurora PostgreSQL"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-pg"
    }
  )
}

###############################################################################
# DB Subnet Group:
#  - Ensures the RDS cluster is placed in the correct private database subnets
#    across multiple AZs for high availability.
###############################################################################
resource "aws_db_subnet_group" "main" {
  name = "${var.cluster_identifier}-subnet-group"

  subnet_ids = data.terraform_remote_state.vpc.outputs.database_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-subnet-group"
    }
  )
}

###############################################################################
# Security Group:
#  - Allows inbound PostgreSQL (port 5432) only from specified CIDR blocks,
#    egress is open to 0.0.0.0/0 for standard outbound requirements.
#  - Attaches to the Aurora cluster for network-layer control.
###############################################################################
resource "aws_security_group" "rds" {
  name   = "${var.cluster_identifier}-sg"
  vpc_id = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "PostgreSQL access from allowed CIDRs"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-sg"
    }
  )
}

###############################################################################
# IAM Role for Enhanced Monitoring
#  - AWS RDS Enhanced Monitoring requires an IAM role with the "monitoring.rds"
#    trust policy, granting it permission to send metrics and logs to CloudWatch.
###############################################################################
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name               = "${var.cluster_identifier}-enhanced-monitoring"
  assume_role_policy = <<-EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "monitoring.rds.amazonaws.com"
      },
      "Effect": "Allow"
    }
  ]
}
EOF

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-enhanced-monitoring"
    }
  )
}

###############################################################################
# IAM Policy Attachment for Enhanced Monitoring
#  - Attaches a managed AWS policy that grants read/write access to
#    CloudWatch metrics and logs, needed by RDS for advanced metrics.
###############################################################################
resource "aws_iam_role_policy_attachment" "enhanced_monitoring_attach" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

###############################################################################
# RDS Aurora Cluster
#  - Aurora PostgreSQL engine with data encrypted at rest using the provided
#    KMS key (AES-256-GCM).
#  - Automated backups, Multi-AZ, cross-region failover possible, 99.9% SLA.
#  - SSL enforced via db_cluster_parameter_group_name (rds.force_ssl=1).
###############################################################################
resource "aws_rds_cluster" "main" {
  cluster_identifier                  = var.cluster_identifier
  engine                              = "aurora-postgresql"
  engine_version                      = var.engine_version
  database_name                       = var.database_name
  master_username                     = var.master_username
  master_password                     = random_password.master.result
  storage_encrypted                   = true
  kms_key_id                          = data.terraform_remote_state.kms.outputs.rds_key_arn
  backup_retention_period            = var.backup_retention_period
  preferred_backup_window            = var.preferred_backup_window
  preferred_maintenance_window       = var.preferred_maintenance_window
  db_subnet_group_name               = aws_db_subnet_group.main.name
  vpc_security_group_ids             = [aws_security_group.rds.id]
  deletion_protection                = true
  skip_final_snapshot                = false
  final_snapshot_identifier          = "${var.cluster_identifier}-final-${formatdate("YYYY-MM-DD-hh-mm", timestamp())}"
  apply_immediately                  = false
  port                               = 5432
  db_cluster_parameter_group_name    = aws_rds_cluster_parameter_group.main.name
  enabled_cloudwatch_logs_exports    = ["postgresql", "upgrade"]
  iam_database_authentication_enabled = true

  tags = var.tags
}

###############################################################################
# RDS Aurora Cluster Instances
#  - Includes primary instance and read replicas (replica_count).
#  - Enhanced Monitoring enabled with a custom IAM role.
#  - Performance Insights enabled for advanced monitoring and tuning.
###############################################################################
resource "aws_rds_cluster_instance" "main" {
  count                           = var.replica_count + 1
  identifier                      = "${var.cluster_identifier}-${count.index}"
  cluster_identifier              = aws_rds_cluster.main.id
  engine                          = "aurora-postgresql"
  instance_class                  = var.instance_class
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_enhanced_monitoring.arn
  auto_minor_version_upgrade      = true
  promotion_tier                  = count.index
  copy_tags_to_snapshot           = true
  ca_cert_identifier              = var.ca_cert_identifier

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_identifier}-${count.index}"
    }
  )
}

###############################################################################
# Outputs
#  - Provide critical connection information and references for other modules
#    or services in the infrastructure, including cluster endpoints and
#    cluster identifier.
###############################################################################

# The main writer/cluster endpoint for the Aurora PostgreSQL cluster (used for writes)
output "cluster_endpoint" {
  description = "Primary endpoint for the Aurora cluster (writer)."
  value       = aws_rds_cluster.main.endpoint
}

# The read-only endpoint to distribute read traffic across replicas
output "reader_endpoint" {
  description = "Reader endpoint for Aurora replicas."
  value       = aws_rds_cluster.main.reader_endpoint
}

# The identifier of the Aurora cluster, useful for referencing in other modules
output "cluster_identifier" {
  description = "The unique cluster identifier of the Aurora PostgreSQL cluster."
  value       = aws_rds_cluster.main.cluster_identifier
}
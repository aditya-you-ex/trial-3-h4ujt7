###############################################################################
# TaskStream AI - AWS ElastiCache for Redis Main Configuration
#
# Description:
#   This Terraform file provisions a production-grade Redis 7.x cluster in AWS
#   ElastiCache with high availability, cluster mode enabled, encryption at
#   rest/transit, and an advanced parameter group. It implements all
#   requirements specified for caching and real-time data needs in the
#   TaskStream AI platform, such as multi-AZ failover and secure access.
#
# Requirements Addressed (LD2):
#   - Redis 7.0+ for caching and real-time data
#   - Production-ready AWS ElastiCache cluster with advanced security settings
#   - High availability with multi-AZ deployment
#
# Imports (IE1, IE2):
#   - Internal variables for vpc_id, subnet_ids, kms_key_id, environment, etc.
#   - External AWS provider at ~>5.0
#
# Style & Comments (S1, S2):
#   - Enterprise-ready Terraform code
#   - Comprehensive comments explaining each resource and attribute
###############################################################################

###############################################################################
# Terraform Configuration
###############################################################################
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

###############################################################################
# Local Values
#
# local.name_prefix:
#    A prefix used for resource naming that combines "taskstream" with the
#    selected environment (dev, staging, production).
# local.common_tags:
#    Common tags applied to all resources, mapping to enterprise tagging
#    standards for cost tracking, environment clarity, and resource ownership.
###############################################################################
locals {
  name_prefix = "taskstream-${var.environment}"

  common_tags = {
    Project     = "TaskStream"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

###############################################################################
# Resource: aws_security_group.redis
#
# Purpose:
#   Defines a security group for the Redis cluster, restricting inbound
#   traffic to only the specified application security group. Allows egress
#   to all destinations if needed. This ensures that only known application
#   services can connect to the Redis cluster via port 6379.
#
# Key Attributes:
#   - name: Unique name derived from environment
#   - vpc_id: The VPC in which the Redis cluster resides
#   - ingress: Permits inbound Redis traffic from the application security group
#   - egress: Unrestricted (default) outbound access
#   - tags: Common tags for governance and cost reporting
###############################################################################
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Security group for TaskStream Redis cluster"
  vpc_id      = var.vpc_id

  # Inbound rules: allow Redis traffic from the designated application SG
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    cidr_blocks     = []
    security_groups = [var.app_security_group_id]
  }

  # Outbound rules: allow all egress
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

###############################################################################
# Resource: aws_elasticache_subnet_group.redis
#
# Purpose:
#   Defines an ElastiCache subnet group to place the Redis cluster in the
#   private or database subnets. Ensures multi-AZ coverage for high
#   availability. This resource references var.subnet_ids from the imported
#   variables file.
#
# Key Attributes:
#   - name: Unique name derived from environment
#   - subnet_ids: List of subnets across multiple AZs
#   - tags: Inherits the common enterprise tags
###############################################################################
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis-subnet-group"
  description = "Subnet group for ElastiCache cluster deployment"
  subnet_ids  = var.subnet_ids
  tags        = local.common_tags
}

###############################################################################
# Resource: aws_elasticache_parameter_group.redis
#
# Purpose:
#   Defines a custom parameter group with specific tunes for Redis 7.0,
#   enabling cluster mode, active defragmentation, and a volatile-lru
#   memory policy. The parameter family is set to redis7.0 for compliance
#   with the platform’s requirement of Redis 7.0+.
#
# Key Attributes:
#   - family: Must match redis7.0 or higher
#   - parameters: A map of advanced settings (cluster-enabled, maxmemory-policy)
#   - tags: Common enterprise tags
###############################################################################
resource "aws_elasticache_parameter_group" "redis" {
  name        = "${local.name_prefix}-redis-params"
  family      = "redis7.0"
  description = "Custom parameters for TaskStream Redis cluster"

  parameters = {
    maxmemory-policy        = "volatile-lru"
    activedefrag            = "yes"
    cluster-enabled         = "yes"
    notify-keyspace-events  = "Ex"
    maxmemory-samples       = "10"
    tcp-keepalive           = "300"
  }

  tags = local.common_tags
}

###############################################################################
# Resource: aws_elasticache_replication_group.redis
#
# Purpose:
#   Provisions the core Redis replication group with multi-AZ, automatic
#   failover, encryption at rest and in transit, snapshot backups,
#   and maintenance scheduling. This resource references the parameter
#   group as well as the subnet group, ensuring all advanced settings
#   are applied.
#
# Key Attributes:
#   - replication_group_id: Derived from environment for uniqueness
#   - parameter_group_name: Links to aws_elasticache_parameter_group.redis
#   - security_group_ids: Restricts inbound to aws_security_group.redis
#   - encryption: Both at rest (KMS) and in transit (TLS)
#   - maintenance_window: Controlled schedule for updates
#   - snapshot_window: Automatic snapshot time window
#   - cluster mode: Referenced via parameter group
###############################################################################
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${local.name_prefix}-redis"
  replication_group_description = "TaskStream Redis cluster"

  engine           = "redis"
  engine_version   = "7.0"
  port             = 6379
  node_type        = "cache.r6g.large"

  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # High availability and failover
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # For a single shard with 2 replicas in non-shard-configuration
  num_cache_clusters = 3

  # Network & security configuration
  subnet_group_name   = aws_elasticache_subnet_group.redis.name
  security_group_ids  = [aws_security_group.redis.id]
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  kms_key_id                 = var.kms_key_id

  # Maintenance and snapshot settings
  snapshot_window = "03:00-05:00"
  maintenance_window = "mon:05:00-mon:07:00"

  # Version upgrades and immediate application
  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = local.common_tags
}

###############################################################################
# Output: redis_endpoint
#
# Purpose:
#   Exports the primary endpoint address of the Redis replication group,
#   enabling other modules or microservices to connect to Redis
#   programmatically.
###############################################################################
output "redis_endpoint" {
  description = "Primary endpoint for Redis cluster access"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

###############################################################################
# Output: redis_port
#
# Purpose:
#   Exports the port on which the Redis replication group listens, allowing
#   external consumers to configure their port connections as needed.
###############################################################################
output "redis_port" {
  description = "Port number for Redis connections"
  value       = aws_elasticache_replication_group.redis.port
}

###############################################################################
# Output: redis_security_group_id
#
# Purpose:
#   Exports the security group ID associated with the Redis cluster, providing
#   reference for further configuration or for establishing additional ingress
#   rules in application modules.
###############################################################################
output "redis_security_group_id" {
  description = "Security group ID for Redis cluster"
  value       = aws_security_group.redis.id
}
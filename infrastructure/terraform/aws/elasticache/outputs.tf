###############################################################################
# TaskStream AI - AWS ElastiCache Outputs
#
# Description:
#   This Terraform file defines output variables that expose critical
#   connection details, security group information, and parameter group
#   settings for the Redis 7.x cluster provisioned via ElastiCache. These
#   outputs are essential for other modules and microservices in the
#   TaskStream AI platform to properly connect, configure, and manage
#   the Redis cache layer.
#
# Imports (IE1):
#   - aws_elasticache_replication_group.redis (from main.tf):
#       * primary_endpoint_address  (string)
#       * port                     (number)
#       * configuration_endpoint_address (string)
#   - aws_security_group.redis (from main.tf):
#       * id                       (string)
#   - aws_elasticache_parameter_group.redis (from main.tf):
#       * name                     (string)
#       * family                   (string)
#
# Style & Comments (S1, S2):
#   - Enterprise-ready Terraform code
#   - Comprehensive in-line comments explaining each output
###############################################################################

# -----------------------------------------------------------------------------
# Output: redis_endpoint
#
# Purpose:
#   - Provides the primary endpoint address for direct Redis cluster
#     interactions in single-node operations. This is generally used by
#     clients and application services that do not explicitly operate in
#     cluster mode but still require Redis connectivity.
# -----------------------------------------------------------------------------
output "redis_endpoint" {
  description = "Primary endpoint address for Redis cluster single-node operations and basic connectivity"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# -----------------------------------------------------------------------------
# Output: redis_configuration_endpoint
#
# Purpose:
#   - Exposes the configuration endpoint for Redis cluster mode operations.
#     This endpoint is used by distributed and cluster-aware clients to
#     leverage sharding, failover, and advanced replication features.
# -----------------------------------------------------------------------------
output "redis_configuration_endpoint" {
  description = "Configuration endpoint address for Redis cluster mode operations and distributed caching"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

# -----------------------------------------------------------------------------
# Output: redis_port
#
# Purpose:
#   - Provides the port number on which the ElastiCache Redis cluster
#     is listening (default: 6379). Ensures downstream services know the
#     correct port to target for a successful connection.
# -----------------------------------------------------------------------------
output "redis_port" {
  description = "Port number for Redis cluster connections (default: 6379)"
  value       = aws_elasticache_replication_group.redis.port
}

# -----------------------------------------------------------------------------
# Output: redis_security_group_id
#
# Purpose:
#   - Publishes the ID of the security group assigned to the Redis
#     cluster. Other modules (e.g., application modules) can reference
#     this ID to allow inbound or outbound connections, ensuring secure
#     and controlled network access.
# -----------------------------------------------------------------------------
output "redis_security_group_id" {
  description = "Security group ID controlling network access to Redis cluster nodes"
  value       = aws_security_group.redis.id
}

# -----------------------------------------------------------------------------
# Output: redis_parameter_group_name
#
# Purpose:
#   - Exposes the name of the custom Redis parameter group that
#     configures advanced settings (e.g., cluster-enabled, memory
#     policies). Other modules or operators can reference this output
#     when adjusting or monitoring the cluster configuration.
# -----------------------------------------------------------------------------
output "redis_parameter_group_name" {
  description = "Redis parameter group name for cluster configuration management and tuning"
  value       = aws_elasticache_parameter_group.redis.name
}

# -----------------------------------------------------------------------------
# Output: redis_parameter_group_family
#
# Purpose:
#   - Returns the parameter group family (e.g., redis7.0) to indicate
#     which version of Redis is targeted. Ensures compatibility and
#     consistency with specified platform requirements for Redis 7.0+.
# -----------------------------------------------------------------------------
output "redis_parameter_group_family" {
  description = "Redis parameter group family version (e.g., redis7.0) for configuration compatibility"
  value       = aws_elasticache_parameter_group.redis.family
}
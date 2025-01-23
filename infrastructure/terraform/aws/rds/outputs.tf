###############################################################################
# TaskStream AI - RDS Aurora PostgreSQL Outputs
#
# Description:
#   This file defines Terraform outputs for the AWS Aurora PostgreSQL cluster
#   required by downstream modules and services. It provides secure references
#   to essential database connection attributes (e.g., writer endpoint, read
#   endpoint, cluster identifier, port) and security group configuration details,
#   without exposing sensitive information such as the master password. Through
#   these outputs, we satisfy critical requirements for:
#
#    1) Primary Database Configuration
#       (Ref: Technical Specifications §4.3.1 — PostgreSQL 14+)
#         - Ensures database connectivity for write operations via the writer
#           endpoint and large-scale read replicas via the reader endpoint.
#         - Provides cluster identifier to enable horizontal sharding or
#           cross-region failover logic in external modules.
#
#    2) High Availability
#       (Ref: Technical Specifications §8.1 — Multi-AZ Deployment)
#         - Exposes the cluster identifier for robust multi-AZ configurations.
#         - Enables cross-region failover management through cluster
#           reference in external auto-scaling or DR modules.
#
#    3) Data Security
#       (Ref: Technical Specifications §7.2.1 — Encryption Standards)
#         - Avoids exporting master passwords or direct connection strings.
#         - Restricts knowledge of the database security group ID to
#           authorized modules only, enabling strict access controls.
#
# Imports:
#   - aws_rds_cluster.main:
#       endpoint          (string)
#       reader_endpoint   (string)
#       cluster_identifier(string)
#       port              (number)
#   - aws_security_group.rds:
#       id                (string)
#
# External Provider (IE2):
#   - Requires 'aws' provider from 'hashicorp/aws' version '~> 5.0'
#
# Notes:
#   - Sensitive values (master_password, connection_string) are intentionally
#     omitted in compliance with security best practices.
#   - Extensive comments are included for enterprise-grade clarity.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
}

###############################################################################
# Output: cluster_endpoint
# Purpose:
#   The primary writer endpoint of the Aurora PostgreSQL cluster for handling
#   write operations. Enabling horizontal scaling through Aurora replicas
#   behind the separate reader endpoint, this output refers to:
#   - aws_rds_cluster.main.endpoint
# Usage:
#   Modules requiring direct write capabilities will reference this endpoint
#   for transaction-intensive queries.
###############################################################################
output "cluster_endpoint" {
  description = "Primary endpoint (writer) for the Aurora PostgreSQL cluster."
  value       = aws_rds_cluster.main.endpoint
}

###############################################################################
# Output: reader_endpoint
# Purpose:
#   The dedicated read-only endpoint of the Aurora cluster, distributing
#   read-heavy workloads across replicas. Useful for improved performance
#   and separation of read traffic from write operations.
# Reference:
#   - aws_rds_cluster.main.reader_endpoint
# Usage:
#   Analytics or reporting modules can point to this endpoint to scale out
#   read capacity.
###############################################################################
output "reader_endpoint" {
  description = "Load-balanced read-only endpoint for Aurora PostgreSQL replicas."
  value       = aws_rds_cluster.main.reader_endpoint
}

###############################################################################
# Output: cluster_identifier
# Purpose:
#   The unique identifier for the Aurora PostgreSQL cluster. Critical for
#   cluster-level operations, cross-region failover planning, and certain
#   automation tooling that references the cluster by identifier.
# Reference:
#   - aws_rds_cluster.main.cluster_identifier
# Usage:
#   Used by DR modules, performance automation, or advanced failover logic
#   requiring cluster-level identification.
###############################################################################
output "cluster_identifier" {
  description = "Unique identifier for the Aurora PostgreSQL cluster (multi-AZ/core)."
  value       = aws_rds_cluster.main.cluster_identifier
}

###############################################################################
# Output: port
# Purpose:
#   Exports the user-configured port on which Aurora PostgreSQL is running
#   (default 5432). Facilitates dynamic service discovery and consistent
#   connection management across microservices.
# Reference:
#   - aws_rds_cluster.main.port
# Usage:
#   Other modules can programmatically build connection strings without
#   hardcoding port values.
###############################################################################
output "port" {
  description = "Port for the Aurora PostgreSQL cluster (default is 5432)."
  value       = aws_rds_cluster.main.port
}

###############################################################################
# Output: security_group_id
# Purpose:
#   The unique ID of the AWS Security Group controlling inbound (port 5432)
#   and outbound traffic for this RDS cluster. Ensures restricted access
#   aligned with enterprise-grade security best practices from the
#   technical specifications on data security.
# Reference:
#   - aws_security_group.rds.id
# Usage:
#   Allows dependent modules (e.g., application services) to reference
#   and attach themselves to the same security group, or enable additional
#   ingress rules if needed.
###############################################################################
output "security_group_id" {
  description = "ID of the Security Group regulating inbound/outbound traffic for the Aurora cluster."
  value       = aws_security_group.rds.id
}
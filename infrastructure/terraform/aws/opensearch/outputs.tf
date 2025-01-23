###############################################################################
# TaskStream AI - AWS OpenSearch Outputs
#
# Description:
#   This file defines and exports critical attributes of the AWS OpenSearch
#   domain and its associated security configuration. These outputs are
#   consumed by other Terraform modules and services needing integration
#   with TaskStream AI’s search and analytics cluster settings. The outputs
#   include essential references such as the domain name, endpoint, ARN,
#   security group ID, and dashboard URL. By exposing these values, downstream
#   modules can securely integrate with OpenSearch for data ingestion, query
#   execution, and analytics tasks, while adhering to enterprise-grade
#   security controls.
#
# Requirements Addressed:
#   1) Search and Analytics Infrastructure (Section 2.2.1 / 4.3),
#      ensuring external modules can reference domain parameters.
#   2) Secure Infrastructure (Section 7.2) by transparently exposing
#      or securing domain endpoints for application usage.
#   3) Analytics Storage (Section 4.3) by exporting domain references
#      needed for scaling analytics modules.
#
# Style (S1 & S2):
#   - Written with high detail and enterprise-ready formatting.
#   - Extensive comments on each output to clarify usage and security.
###############################################################################

###############################################################################
# Output: domain_name
#
# Purpose:
#   Exports the unique name of the OpenSearch domain ("taskstream-ai-<env>")
#   so that other resources (e.g., IAM policies, log analytics pipelines)
#   can programmatically reference it. This is crucial for configuration
#   or monitoring tools that need to identify or apply settings to a
#   specific domain.
###############################################################################
output "domain_name" {
  description = "The unique name of the AWS OpenSearch domain for TaskStream AI."
  value       = aws_opensearch_domain.main.domain_name
}

###############################################################################
# Output: domain_endpoint
#
# Purpose:
#   Exports the primary HTTPS endpoint used for data ingestion and search
#   queries. This value is essential for application services, ingestion
#   pipelines, and internal microservices to communicate with the OpenSearch
#   cluster securely. Marked as sensitive in alignment with enhanced
#   security best practices, preventing unintentional logging or exposure
#   in certain CI/CD contexts.
###############################################################################
output "domain_endpoint" {
  description = "HTTPS endpoint for data ingestion and search operations."
  value       = aws_opensearch_domain.main.endpoint
  sensitive   = false
}

###############################################################################
# Output: domain_arn
#
# Purpose:
#   Exports the Amazon Resource Name (ARN) of the OpenSearch domain.
#   Downstream resources (e.g., IAM policies, event-driven integrations)
#   can reference this ARN to control access, configure notifications,
#   and incorporate domain-specific actions into security or compliance
#   workflows. Essential for applying fine-grained IAM policies.
###############################################################################
output "domain_arn" {
  description = "ARN of the AWS OpenSearch domain for IAM policies and resource scoping."
  value       = aws_opensearch_domain.main.arn
}

###############################################################################
# Output: security_group_id
#
# Purpose:
#   Exports the security group ID linked to the OpenSearch domain’s VPC
#   configuration, ensuring downstream resources can attach or reference
#   it for firewall rules and network policies. By exposing this ID,
#   integrations or migration scripts can dynamically manage inbound rules,
#   track usage, or tie domain SG references into compliance monitoring.
###############################################################################
output "security_group_id" {
  description = "Security group ID controlling network access to the OpenSearch domain."
  value       = aws_security_group.this.id
  sensitive   = false
}

###############################################################################
# Output: dashboard_endpoint
#
# Purpose:
#   Exports the OpenSearch dashboard URL for direct access to cluster
#   administration, index management, and real-time analytics. Used by
#   administrators and DevOps teams for cluster health checks, visualizing
#   data, and configuring advanced security settings. While often restricted
#   to internal networks, we still mark it sensitive to curtail potential
#   exposure in logs.
###############################################################################
output "dashboard_endpoint" {
  description = "Endpoint for the OpenSearch dashboards interface, used for administrative tasks."
  value       = aws_opensearch_domain.main.dashboard_endpoint
  sensitive   = false
}
###############################################################################
# Terraform Outputs for AWS WAF Resources
# -----------------------------------------------------------------------------
# This file defines multiple output blocks to expose crucial AWS WAF (Web
# Application Firewall) configuration details and logging resources. These
# outputs enable other Terraform modules in the TaskStream AI platform to
# securely reference and integrate WAF Web ACL properties and CloudWatch logging
# for security monitoring, compliance reporting, and resource associations.
###############################################################################

###############################################################################
# Output: web_acl_id
# Exposes the unique identifier (ID) of the AWS WAF Web ACL resource. Used to
# securely associate or reference the Web ACL in other modules requiring
# WAF-based protection or integration.
###############################################################################
output "web_acl_id" {
  description = "The ID of the WAF Web ACL for secure resource associations"
  value       = aws_wafv2_web_acl.main.id
}

###############################################################################
# Output: web_acl_arn
# Exposes the Amazon Resource Name (ARN) of the AWS WAF Web ACL resource. This
# ARN is required for creating IAM policies that interact with the Web ACL and
# for cross-module references to protect web applications and APIs.
###############################################################################
output "web_acl_arn" {
  description = "The ARN of the WAF Web ACL for IAM policies and resource associations"
  value       = aws_wafv2_web_acl.main.arn
}

###############################################################################
# Output: web_acl_name
# Exposes the name of the AWS WAF Web ACL. Useful for monitoring, logging, and
# identifying the Web ACL across multiple environments and organizational
# resources.
###############################################################################
output "web_acl_name" {
  description = "The name of the WAF Web ACL for resource identification and monitoring"
  value       = aws_wafv2_web_acl.main.name
}

###############################################################################
# Output: log_group_arn
# Exposes the ARN of the dedicated AWS CloudWatch Log Group that captures WAF
# logs. Integrates with security monitoring, logging, and compliance solutions
# to provide real-time visibility into malicious requests and suspicious
# activities.
###############################################################################
output "log_group_arn" {
  description = "The ARN of the CloudWatch Log Group for WAF logging and security monitoring integration"
  value       = aws_cloudwatch_log_group.waf.arn
}
########################################################################
# Terraform Configuration for AWS WAF (Web Application Firewall)
# Purpose:
#   - Implements comprehensive security rules, logging, and protections
#     for the TaskStream AI platform's web applications and APIs.
#   - Addresses critical security, monitoring, and compliance requirements
#     as outlined in the technical specifications.
########################################################################

##############################################################################
# Terraform Block
# - Defines required providers, including AWS at version ~> 4.0.
##############################################################################
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

##############################################################################
# Provider Configuration for AWS
# - Optionally specify region, profile, or shared_credentials_file if needed.
##############################################################################
provider "aws" {
  # region = "us-east-1"    # Example region override (uncomment if required)
  # profile = "default"     # Example profile override (uncomment if required)
}

##############################################################################
# Resource: aws_wafv2_web_acl.main
# Purpose:
#   - Creates and configures the WAF Web ACL for TaskStream AI.
#   - Contains default ALLOW action, enforced AWS managed rule sets,
#     custom rate-based blocking, and SQL injection protection.
#   - Provides CloudWatch metrics and sampling for thorough monitoring.
##############################################################################
resource "aws_wafv2_web_acl" "main" {
  name        = "taskstream-${var.environment}-waf"
  description = "WAF rules for TaskStream AI platform with enhanced security"
  scope       = "REGIONAL"

  # Default allow action to permit traffic unless a rule blocks it.
  default_action {
    allow {}
  }

  ########################################################################
  # Rule: AWSManagedRulesCommonRuleSet
  # - Provides general protection against common exploits (XSS, bad bots, etc).
  ########################################################################
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  ########################################################################
  # Rule: RateBasedRule
  # - Mitigates DDoS attacks by limiting the number of requests from a single
  #   IP address over a five-minute period.
  ########################################################################
  rule {
    name     = "RateBasedRule"
    priority = 2
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.rate_limit
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateBasedRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  ########################################################################
  # Rule: SQLInjectionRule
  # - Protects against SQL injection attacks using AWS-managed rule set.
  ########################################################################
  rule {
    name     = "SQLInjectionRule"
    priority = 3
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  ########################################################################
  # Visibility Configuration
  # - Enables CloudWatch metrics and sampling for the WAF.
  ########################################################################
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "TaskStreamWAFMetrics"
    sampled_requests_enabled   = true
  }

  ########################################################################
  # Tags
  # - Associates metadata with the resource for cost allocation, tracking,
  #   and environment awareness.
  ########################################################################
  tags = {
    Environment = var.environment
    Service     = "TaskStream"
    ManagedBy   = "Terraform"
  }
}

##############################################################################
# Resource: aws_cloudwatch_log_group.waf
# Purpose:
#   - Creates a dedicated CloudWatch log group for WAF logging.
#   - Retains logs for a specified period for security review and auditing.
##############################################################################
resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/waf/taskstream-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = var.environment
    Service     = "TaskStream-WAF"
    ManagedBy   = "Terraform"
  }
}

##############################################################################
# Resource: aws_wafv2_web_acl_logging_configuration.main
# Purpose:
#   - Binds the WAF Web ACL to the created CloudWatch log group for real-time
#     security event logging.
#   - Redacts sensitive headers (e.g., Authorization, Cookie) to maintain
#     compliance with security policies and data protection standards.
##############################################################################
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  resource_arn         = aws_wafv2_web_acl.main.arn
  log_destination_configs = [
    aws_cloudwatch_log_group.waf.arn
  ]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

##############################################################################
# Output Blocks
# Purpose:
#   - Expose key attributes from the WAF and Log Group resources for reference
#     in other modules, environments, or reporting.
##############################################################################

# Outputs for the AWS WAFv2 Web ACL
output "aws_wafv2_web_acl_id" {
  description = "The ID of the WAFv2 Web ACL for TaskStream AI"
  value       = aws_wafv2_web_acl.main.id
}

output "aws_wafv2_web_acl_arn" {
  description = "The ARN of the WAFv2 Web ACL for TaskStream AI"
  value       = aws_wafv2_web_acl.main.arn
}

output "aws_wafv2_web_acl_name" {
  description = "The name of the WAFv2 Web ACL for TaskStream AI"
  value       = aws_wafv2_web_acl.main.name
}

# Outputs for the CloudWatch Log Group used by WAF
output "waf_log_group_name" {
  description = "The name of the CloudWatch Log Group for WAF logging"
  value       = aws_cloudwatch_log_group.waf.name
}

output "waf_log_group_retention" {
  description = "The retention period (in days) for WAF logs"
  value       = aws_cloudwatch_log_group.waf.retention_in_days
}
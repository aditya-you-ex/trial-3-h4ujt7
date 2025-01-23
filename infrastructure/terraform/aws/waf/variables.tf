###############################################################################
# External Import: hashicorp/terraform ~> 1.0
# Defines variables for AWS WAF configuration with strict validation to meet
# enterprise-grade security and monitoring requirements.
###############################################################################

################################################################################
# Variable: environment
# Purpose:
#   - Specifies the environment (e.g., dev, staging, prod) for WAF resource
#     tagging and naming with strict validation against accepted values.
################################################################################
variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod) for WAF resource naming and tagging with strict validation"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

################################################################################
# Variable: rate_limit
# Purpose:
#   - Sets a numerical threshold (number of requests per 5-minute period) for
#     IP-based rate limiting to protect against DDoS attacks. Includes validation
#     bounds to ensure acceptable security levels.
################################################################################
variable "rate_limit" {
  type        = number
  description = "Number of requests allowed per 5-minute period from an IP address for DDoS protection"
  default     = 1000

  validation {
    condition     = var.rate_limit >= 100 && var.rate_limit <= 10000
    error_message = "Rate limit must be between 100 and 10000 requests per 5-minute period"
  }
}

################################################################################
# Variable: log_retention_days
# Purpose:
#   - Defines how many days WAF logs are retained in CloudWatch for monitoring
#     and compliance. Only valid AWS retention periods are permitted.
################################################################################
variable "log_retention_days" {
  type        = number
  description = "Number of days to retain WAF logs in CloudWatch for security analysis and compliance"
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch retention period"
  }
}

################################################################################
# Variable: tags
# Purpose:
#   - Assigns a set of tags to WAF and associated AWS resources for cost
#     allocation, resource management, and security posture tracking.
################################################################################
variable "tags" {
  type        = map(string)
  description = "Tags to apply to WAF and related resources for resource management and cost allocation"
  default     = {
    Service       = "TaskStream"
    ManagedBy     = "Terraform"
    Component     = "WAF"
    SecurityLevel = "Critical"
  }
}
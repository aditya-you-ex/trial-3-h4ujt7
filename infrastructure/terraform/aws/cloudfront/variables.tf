###############################################################################
# Terraform Configuration for AWS CloudFront Variables
# This file defines all input parameters required to deploy and configure
# an AWS CloudFront distribution in the TaskStream AI infrastructure.
# 
# In accordance with the Technical Specifications, these variables address:
# 1) Content Delivery Network (Technical Specifications/8.2 Cloud Services)
# 2) Global Infrastructure (Technical Specifications/8.1 Deployment Environment)
# 3) Security Integration with WAF (Technical Specifications/7.3.1 Access Control)
#
###############################################################################

###############################################################################
# Terraform & Provider Requirements
# Specifying the minimum Terraform version and the AWS provider version.
###############################################################################
terraform {
  required_version = "~> 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws" 
      version = "~> 5.0" # AWS provider (v5.0)
    }
  }
}

###############################################################################
# VARIABLE: environment
# Description: Specifies the deployment environment name for the CloudFront
# distribution, typically one of dev, staging, or prod. This value helps
# in naming conventions, resource naming, and environment-specific behavior.
###############################################################################
variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., dev, staging, prod)."

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

###############################################################################
# VARIABLE: domain_name
# Description: The primary domain name for which the CloudFront distribution
# will serve content. This domain name is used for SSL certificate association
# and route configurations.
###############################################################################
variable "domain_name" {
  type        = string
  description = "Primary domain name for the CloudFront distribution."
}

###############################################################################
# VARIABLE: price_class
# Description: Defines the AWS CloudFront price class to limit or expand the
# edge locations utilized by the distribution, aiming to balance cost and
# performance (PriceClass_100, PriceClass_200, PriceClass_All).
###############################################################################
variable "price_class" {
  type        = string
  description = "CloudFront distribution price class determining edge location coverage."
  default     = "PriceClass_100"

  validation {
    condition     = can(regex("^PriceClass_(100|200|All)$", var.price_class))
    error_message = "Price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All"
  }
}

###############################################################################
# VARIABLE: min_ttl
# Description: The minimum amount of time (in seconds) that objects stay
# in the CloudFront cache before CloudFront attempts to revalidate them.
###############################################################################
variable "min_ttl" {
  type        = number
  description = "Minimum time to live (TTL) for cached objects in seconds."
  default     = 0
}

###############################################################################
# VARIABLE: default_ttl
# Description: The default time (in seconds) that objects stay in the CloudFront
# cache if no cache settings are specified in the origin response headers.
###############################################################################
variable "default_ttl" {
  type        = number
  description = "Default time to live (TTL) for cached objects in seconds."
  default     = 3600
}

###############################################################################
# VARIABLE: max_ttl
# Description: The maximum time (in seconds) that objects stay in the CloudFront
# cache before CloudFront queries the origin to determine whether the object has
# been updated.
###############################################################################
variable "max_ttl" {
  type        = number
  description = "Maximum time to live (TTL) for cached objects in seconds."
  default     = 86400
}

###############################################################################
# VARIABLE: tags
# Description: A map of key-value pairs for tagging AWS resources associated
# with the CloudFront distribution. Useful for cost allocation and resource
# organization within enterprise environments.
###############################################################################
variable "tags" {
  type        = map(string)
  description = "Additional tags to apply to CloudFront resources."
  default     = {}
}

###############################################################################
# VARIABLE: waf_web_acl_id
# Description: The ID of the AWS WAF Web ACL resource to associate with the
# CloudFront distribution. This integration helps in preventing malicious
# traffic and enhancing security.
###############################################################################
variable "waf_web_acl_id" {
  type        = string
  description = "ID of WAF web ACL to associate with the CloudFront distribution."
  default     = null
}

###############################################################################
# VARIABLE: ssl_certificate_arn
# Description: The ARN of the ACM SSL/TLS certificate to enable HTTPS for the
# CloudFront distribution’s domain_name. This ensures secure data in transit
# in accordance with enterprise security standards.
###############################################################################
variable "ssl_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for CloudFront distribution SSL/TLS."
}

###############################################################################
# VARIABLE: allowed_methods
# Description: A list of HTTP methods that clients can use when requesting
# content through CloudFront. Typically includes GET, HEAD, OPTIONS, and
# can be extended to POST, PUT, etc. if required.
###############################################################################
variable "allowed_methods" {
  type        = list(string)
  description = "List of allowed HTTP methods for CloudFront distribution."
  default     = ["GET", "HEAD", "OPTIONS"]
}

###############################################################################
# VARIABLE: cached_methods
# Description: Defines which HTTP methods CloudFront caches. Typically limited
# to safe, idempotent methods like GET and HEAD to optimize performance and
# avoid caching sensitive data from non-safe requests.
###############################################################################
variable "cached_methods" {
  type        = list(string)
  description = "List of HTTP methods that should be cached by CloudFront."
  default     = ["GET", "HEAD"]
}
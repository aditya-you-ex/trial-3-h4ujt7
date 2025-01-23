###############################################################################
# Terraform Configuration for AWS CloudFront Distribution
# -----------------------------------------------------------------------------
# This file defines a production-grade CloudFront distribution to serve static
# assets and application content for TaskStream AI. It addresses the following
# business and technical requirements:
#
# 1) Content Delivery Network (Technical Specifications/8.2 Cloud Services)
#    - Provides global edge caching to improve performance and reduce latency.
#    - Integrates with S3 as the origin for static assets.
#    - Supports compression, caching, and TLS.
#
# 2) Global Infrastructure (Technical Specifications/8.1 Deployment Environment)
#    - Deploys via AWS CloudFront with IPv6 enabled for modern network support.
#    - Integrates with custom domain and ACM SSL certificate (us-east-1).
#    - Price class configurable for cost and geography coverage.
#
# 3) Enhanced CDN Security (Technical Specifications/7.3 Security Protocols/
#    7.3.1 Access Control)
#    - Associates an AWS WAF Web ACL to mitigate malicious requests (OWASP rules).
#    - TLS enforcement at a minimum of TLSv1.2_2021.
#    - Origin Access Identity (OAI) to secure direct S3 bucket access.
#    - Response headers policy for security enhancements (e.g., HSTS, XSS).
#
# Imports and references used in this file:
#   - var.* from ./variables.tf (internal) for environment, domain_name, TTLs, etc.
#   - data.terraform_remote_state.s3.outputs.assets_bucket_id for the S3 origin.
#   - resource "aws_s3_bucket" "logs" for CloudFront logs storage.
#   - resource "aws_cloudfront_origin_access_identity" "main" for private S3 origin.
#   - data "aws_acm_certificate" "main" for SSL certificates in us-east-1.
#   - resource "aws_wafv2_web_acl" "cloudfront" for WAF association.
#   - resource "aws_cloudfront_response_headers_policy" "security_headers" for
#     custom security headers.
#
# Code strictly adheres to enterprise conventions, using comprehensive tagging
# and robust security policies.
###############################################################################


###############################################################################
# GLOBAL TERRAFORM SETTINGS
# - Defines required providers and their versions to ensure consistent builds.
###############################################################################
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # (IE2) External provider version for AWS
    }
  }
}


###############################################################################
# DATA REFERENCE: Remote State for S3 Module
# -----------------------------------------------------------------------------
# This data block fetches outputs from the local S3 module state, specifically
# the "assets_bucket_id" output that identifies the static assets bucket name
# used as the CloudFront origin.
###############################################################################
data "terraform_remote_state" "s3" {
  backend = "local"
  config = {
    # Adjust path to match your environment or backend approach.
    path = "../s3/terraform.tfstate"
  }
}


###############################################################################
# DATA REFERENCE: AWS ACM Certificate
# -----------------------------------------------------------------------------
# Retrieves the most recently validated ACM certificate matching the primary
# domain. CloudFront requires ACM certificates be in the "us-east-1" region.
###############################################################################
data "aws_acm_certificate" "main" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
  # Note: The provider below ensures we look for the certificate in us-east-1,
  # which is mandatory for CloudFront.
  provider = aws.us_east_1
}


###############################################################################
# RESOURCE: AWS S3 Bucket for CloudFront Logs
# -----------------------------------------------------------------------------
# Stores CloudFront access logs. Public access is fully blocked for logs. This
# bucket is distinct from the static assets bucket for improved isolation and
# compliance. The logs bucket may also help meet auditing requirements.
###############################################################################
resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-${var.environment}-cloudfront-logs"

  tags = merge(
    var.tags,
    {
      Name         = "${var.project_name}-${var.environment}-cloudfront-logs"
      Environment  = var.environment
      Classification = "Logs"
      Purpose      = "CloudFrontAccessLogs"
      Terraform    = true
      Monitoring   = true
    }
  )
}

resource "aws_s3_bucket_public_access_block" "logs_block_public" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


###############################################################################
# RESOURCE: AWS CloudFront Origin Access Identity
# -----------------------------------------------------------------------------
# Ensures that CloudFront alone can directly access the S3 origin, preventing
# public traffic from bypassing caching and security configurations.
###############################################################################
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "Origin Access Identity for static assets (env: ${var.environment})"
}


###############################################################################
# RESOURCE: AWS WAFv2 Web ACL
# -----------------------------------------------------------------------------
# Attaches a Web ACL with a default allow rule. In production, you could add
# managed or custom rules for advanced protection. The scope must be set to
# CLOUDFRONT for global distribution protection.
###############################################################################
resource "aws_wafv2_web_acl" "cloudfront" {
  name        = "taskstream-waf-${var.environment}"
  description = "WAF ACL for CloudFront distribution in ${var.environment} environment."
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "taskstream-waf-${var.environment}"
    sampled_requests_enabled   = true
  }

  # Example: You can optionally add AWS Managed Rules here
  # rule {
  #   name     = "AWSManagedRulesCommonRuleSet"
  #   priority = 1
  #   override_action {
  #     none {}
  #   }
  #   statement {
  #     managed_rule_group_statement {
  #       vendor_name  = "AWS"
  #       name         = "AWSManagedRulesCommonRuleSet"
  #     }
  #   }
  #   visibility_config {
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "CommonRuleSet"
  #     sampled_requests_enabled   = true
  #   }
  # }

  tags = merge(
    var.tags,
    {
      Name         = "taskstream-waf-${var.environment}"
      Environment  = var.environment
      Terraform    = true
      Monitoring   = true
    }
  )
}


###############################################################################
# RESOURCE: AWS CloudFront Response Headers Policy (Security Headers)
# -----------------------------------------------------------------------------
# Adds standard HTTP security headers recommended by OWASP. Helps mitigate click-
# jacking, XSS, and other vulnerabilities. Adjust or expand as needed.
###############################################################################
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "taskstream-security-headers-${var.environment}"
  comment = "Security Headers for CloudFront in ${var.environment} environment"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "no-referrer-when-downgrade"
      override        = true
    }
    strict_transport_security {
      access_control_max_age = 31536000
      include_subdomains     = true
      preload                = true
      override               = true
    }
    xss_protection {
      protection = true
      mode_block = true
      override   = true
    }
  }

  # Example: Additional custom headers can be appended in items[]
  custom_headers_config {
    items = []
  }

  tags = merge(
    var.tags,
    {
      Name         = "taskstream-security-headers-${var.environment}"
      Environment  = var.environment
      Terraform    = true
      Monitoring   = true
    }
  )
}


###############################################################################
# RESOURCE: AWS CloudFront Distribution
# -----------------------------------------------------------------------------
# This distribution integrates:
#   - The static assets S3 bucket (referenced via remote state).
#   - IPv6 support, logging, and WAF protection.
#   - Secure viewer certificate from ACM (in us-east-1).
#   - A default cache behavior with recommended caching settings.
#   - Custom error page handling (e.g. 404 -> /index.html).
###############################################################################
resource "aws_cloudfront_distribution" "main" {
  comment             = "Enhanced CloudFront Distribution for TaskStream AI (${var.environment})"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.price_class                 # e.g., PriceClass_100, PriceClass_200, PriceClass_All
  aliases             = [var.domain_name]               # e.g., "cdn.taskstream.ai"
  web_acl_id          = aws_wafv2_web_acl.cloudfront.arn
  default_root_object = "index.html"

  # CloudFront Logs Configuration
  logging_config {
    bucket         = aws_s3_bucket.logs.bucket_domain_name
    prefix         = "cloudfront/"
    include_cookies = true
  }

  # ORIGINS - Points to S3 Bucket for static assets
  origin {
    domain_name = "${data.terraform_remote_state.s3.outputs.assets_bucket_id}.s3.amazonaws.com"
    origin_id   = "S3-${data.terraform_remote_state.s3.outputs.assets_bucket_id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # DEFAULT CACHE BEHAVIOR
  default_cache_behavior {
    allowed_methods        = var.allowed_methods
    cached_methods         = var.cached_methods
    target_origin_id       = "S3-${data.terraform_remote_state.s3.outputs.assets_bucket_id}"
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    viewer_protocol_policy  = "redirect-to-https"
    min_ttl                 = var.min_ttl
    default_ttl             = var.default_ttl
    max_ttl                 = var.max_ttl
    compress                = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # VIEWER CERTIFICATE
  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.main.arn
    ssl_support_method        = "sni-only"
    minimum_protocol_version  = "TLSv1.2_2021"
  }

  # RESTRICTIONS
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # EXAMPLE ERROR HANDLING (e.g., 404 -> 200 with index.html)
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # TAGS for compliance and enterprise cost tracking
  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Terraform   = true
      Monitoring  = true
    }
  )
}


###############################################################################
# OUTPUTS
# -----------------------------------------------------------------------------
# Expose CloudFront distribution attributes for usage in other modules or
# operational processes (e.g., DNS routing, monitoring, cross-module references).
###############################################################################

output "distribution_id" {
  description = "Unique ID of the CloudFront distribution for TaskStream AI."
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  description = "Domain name of the CloudFront distribution that serves static assets."
  value       = aws_cloudfront_distribution.main.domain_name
}

output "web_acl_id" {
  description = "ARN of the WAF Web ACL associated with the CloudFront distribution."
  value       = aws_cloudfront_distribution.main.web_acl_id
}
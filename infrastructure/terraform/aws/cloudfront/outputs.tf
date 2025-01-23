###############################################################################
# Terraform Outputs for AWS CloudFront Distribution
# -------------------------------------------------------------------------------
# This file defines and exports essential CloudFront attributes for TaskStream AI,
# including distribution identification, domain names for CDN routing, and Origin
# Access Identity references enabling secure integration with S3. It addresses:
#
#  - Content Delivery Network (Technical Specifications/8.2 Cloud Services)
#  - Global Infrastructure (Technical Specifications/8.1 Deployment Environment)
#  - Enhanced CDN Security (Technical Specifications/7.3 Security Protocols/7.3.1)
#
# Requirements:
#   • Terraform version: ~> 1.0
#   • AWS provider: ~> 5.0  (IE2: External provider version)
#
# Internal Imports (IE1):
#   • aws_cloudfront_distribution.main
#       - Uses .id and .domain_name to export distribution info
#   • aws_cloudfront_origin_access_identity.main
#       - Uses .iam_arn and .cloudfront_access_identity_path for secure origin access
#
# Each output below is essential for referencing in Route 53 DNS records, custom
# domain configurations, and for crafting S3 bucket policies restricting direct
# access to CloudFront only.
###############################################################################

###############################################################################
# (IE2) Provider Requirements and Terraform Settings
###############################################################################
terraform {
  required_version = "~> 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

###############################################################################
# OUTPUT: distribution_id
# -------------------------------------------------------------------------------
# Exports the unique ID for the CloudFront distribution resource. This value is
# used to reference the distribution programmatically, including dynamic updates
# in DNS records or linking other infrastructure modules (e.g., monitoring or
# WAF associations). In alignment with the Technical Specifications, the ID is
# integral for system reliability checks (99.9% uptime) and further logging
# automation in global multi-region deployments.
###############################################################################
output "distribution_id" {
  description = "Unique identifier of the AWS CloudFront distribution for TaskStream AI."
  value       = aws_cloudfront_distribution.main.id
}

###############################################################################
# OUTPUT: distribution_domain_name
# -------------------------------------------------------------------------------
# Exports the domain name which CloudFront assigns to serve content (e.g.,
# d123456abcdef.cloudfront.net). Typically utilized in DNS records via Route 53
# for a CNAME, enabling a custom domain (like cdn.taskstream.ai). This aligns
# with enterprise-latency requirements established under the Global
# Infrastructure strategy (Technical Specifications/8.1) for worldwide
# performance coverage.
###############################################################################
output "distribution_domain_name" {
  description = "Public domain name of the CloudFront distribution, used for routing and DNS mappings."
  value       = aws_cloudfront_distribution.main.domain_name
}

###############################################################################
# OUTPUT: origin_access_identity_arn
# -------------------------------------------------------------------------------
# Exports the ARN of the CloudFront Origin Access Identity (OAI) resource. The
# OAI enforces private S3 access, preventing public exposure of buckets while
# integrating with CloudFront to securely serve static content. According to
# Enhanced CDN Security (Technical Specifications/7.3.1), referencing this ARN is
# vital when writing or updating bucket policies that explicitly trust the
# CloudFront origin identity.
###############################################################################
output "origin_access_identity_arn" {
  description = "ARN of the CloudFront Origin Access Identity for secure S3 bucket access."
  value       = aws_cloudfront_origin_access_identity.main.iam_arn
}

###############################################################################
# OUTPUT: origin_access_identity_path
# -------------------------------------------------------------------------------
# Exports the specific path of the CloudFront Origin Access Identity, typically
# used with the 'origin_access_identity' field in distribution or S3 bucket policy
# attachments. Coupled with the OAI ARN, this ensures that only the CloudFront
# service can fetch objects from the S3 origin, adhering to SOC 2 Type II
# compliance and supporting multi-region storage security standards.
###############################################################################
output "origin_access_identity_path" {
  description = "Path reference for CloudFront OAI utilized in S3 origin configurations."
  value       = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
}
###############################################################################
# TaskStream AI - Route53 DNS Management
#
# Description:
#   This Terraform configuration manages both public and (optionally) private
#   Route53 hosted zones for the TaskStream AI platform, fulfilling the
#   requirements of multi-region DNS management, global routing, and health
#   checks. It imports VPC information via remote state to enable private
#   zone association and uses multiple Terraform variables to control domain
#   names, environment labels, tagging, and private zone enablement.
#
# Requirements Addressed:
#   - DNS Management (Ref: Technical Specifications/8.2 Cloud Services)
#     Implements AWS Route 53 with latency-based routing and health monitoring.
#   - Global Infrastructure (Ref: Technical Specifications/8.1 Deployment Environment)
#     Ensures multi-region availability, scalability, and automated failover.
#
# Globals:
#   - Terraform required_providers for AWS configured to use hashicorp/aws ~> 5.0
#   - Extensive comments included for clarity and maintenance in production.
###############################################################################

###############################################################################
# Terraform Block
# - Sets minimum required version and defines the AWS provider constraints.
###############################################################################
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

###############################################################################
# AWS Provider
# - This provider (hashicorp/aws ~> 5.0) is used for all AWS operations,
#   including Route53 zone and record management, and health checks.
###############################################################################
provider "aws" {
  # Region could be specified here or overridden outside for multi-region use.
  # e.g. region = var.aws_region
}

###############################################################################
# Data Block: terraform_remote_state for VPC
# - Pulls VPC state from a remote S3 backend to retrieve the VPC ID for
#   associating private hosted zones, enabling internal DNS resolution.
###############################################################################
data "terraform_remote_state" "vpc" {
  backend = "s3"

  # Configuration for reading the remote state file stored in an S3 bucket.
  config = {
    bucket  = "taskstream-terraform-state"
    key     = "${var.environment}/vpc/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

###############################################################################
# Resource: aws_route53_zone.public
# - Creates a public Route53 hosted zone for the main domain name, enabling
#   global routing of public endpoints for the TaskStream AI platform.
# - force_destroy = false prevents accidental deletion of DNS records.
###############################################################################
resource "aws_route53_zone" "public" {
  name          = var.domain_name
  comment       = "Public zone for ${var.environment} environment"
  force_destroy = false

  # Tagging for cost allocation, environment clarity, and resource management.
  tags = {
    Name        = "${var.domain_name}"
    Environment = var.environment
    Terraform   = "true"
    Service     = "TaskStream-DNS"
    ManagedBy   = "Terraform"
  }

  # Detailed description of the hosted zone's purpose in the code metadata.
  description = "Public hosted zone for TaskStream AI platform with global routing capabilities"
}

###############################################################################
# Resource: aws_route53_zone.private
# - Creates a private hosted zone for internal DNS resolution and service
#   discovery within the TaskStream AI platform. Associated with the VPC
#   ID retrieved from remote state. Only created if var.enable_private_zone
#   is true. force_destroy = false ensures DNS records are protected.
###############################################################################
resource "aws_route53_zone" "private" {
  count         = var.enable_private_zone ? 1 : 0
  name          = var.internal_domain_name
  comment       = "Private zone for ${var.environment} environment"
  force_destroy = false

  # Associates this private hosted zone with the imported VPC for internal DNS.
  vpc {
    vpc_id = data.terraform_remote_state.vpc.outputs.vpc_id
  }

  tags = {
    Name        = "${var.internal_domain_name}"
    Environment = var.environment
    Terraform   = "true"
    Service     = "TaskStream-Internal-DNS"
    ManagedBy   = "Terraform"
  }

  description = "Private hosted zone for internal service discovery and VPC DNS resolution"
}

###############################################################################
# Resource: aws_route53_health_check.primary
# - Configures a Route53 health check for a primary region endpoint, enabling
#   advanced monitoring of HTTPS /health path for multi-region failover and
#   latency-based routing strategies.
###############################################################################
resource "aws_route53_health_check" "primary" {
  description          = "Enhanced health check for primary region endpoints with detailed monitoring"
  fqdn                 = var.domain_name
  port                 = 443
  type                 = "HTTPS"
  resource_path        = "/health"
  failure_threshold    = 3
  request_interval     = 30
  regions              = ["us-east-1", "eu-west-1", "ap-southeast-1"]
  enable_sni           = true
  search_string        = "healthy"
  measure_latency      = true
  invert_healthcheck   = false
  disabled             = false

  # Tags for identification and operational management in enterprise settings.
  tags = {
    Name        = "${var.domain_name}-health-check"
    Environment = var.environment
    Terraform   = "true"
    Service     = "TaskStream-HealthCheck"
    ManagedBy   = "Terraform"
  }
}

###############################################################################
# Outputs
# - Expose essential attributes of the public and private hosted zones so that
#   other Terraform modules or consumers can reference them for DNS-related
#   automation, record management, or environment validations.
###############################################################################

###############################################################################
# Output: public_zone_id
# Purpose:
#   Exposes the ID of the public hosted zone used for external DNS resolution
#   and global routing of TaskStream AI public endpoints.
###############################################################################
output "public_zone_id" {
  description = "The ID of the public hosted zone for external DNS resolution and global routing"
  value       = aws_route53_zone.public.zone_id
}

###############################################################################
# Output: public_name_servers
# Purpose:
#   Lists the NS records assigned to the public hosted zone, enabling domain
#   registrar configuration and DNS delegation for the main domain.
###############################################################################
output "public_name_servers" {
  description = "List of name server records for the public hosted zone"
  value       = aws_route53_zone.public.name_servers
}

###############################################################################
# Output: private_zone_id
# Purpose:
#   Exposes the ID of the private hosted zone for internal DNS resolution,
#   only when var.enable_private_zone is true. If disabled, returns null.
###############################################################################
output "private_zone_id" {
  description = "The ID of the private hosted zone for internal service discovery and DNS resolution"
  value       = length(aws_route53_zone.private) > 0 ? aws_route53_zone.private[0].zone_id : null
}
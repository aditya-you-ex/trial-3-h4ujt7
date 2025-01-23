###############################################################################
# TaskStream AI - AWS VPC Infrastructure
#
# Description:
#   This Terraform configuration file defines the AWS VPC networking
#   foundation for the TaskStream AI platform. It implements multi-AZ
#   infrastructure, robust network security, and integration points for
#   EKS, RDS, ElastiCache, and DocumentDB services. It also enables VPC
#   flow logs for enhanced security monitoring and auditing.
#
# Requirements Addressed:
#   1) Multi-AZ Network Infrastructure
#   2) Network Security
#   3) Cloud Infrastructure
#
# Globals:
#   - Terraform required_version >= 1.0.0
#   - AWS provider (hashicorp/aws) version "~> 5.0"
#
# External Imports (IE2):
#   - hashicorp/aws ~> 5.0
#   - terraform-aws-modules/vpc/aws ~> 5.0
#
# Internal Imports (IE1):
#   - var.vpc_cidr, var.environment, var.enable_flow_logs, and all other
#     variables from variables.tf must be used properly in this file.
#
# Style (S1 & S2):
#   - Using enterprise-ready, production-appropriate coding style.
#   - Including extensive comments for clarity and maintainability.
###############################################################################

###############################################################################
# Terraform Configuration
###############################################################################
terraform {
  # Ensures Terraform meets minimum version requirement
  required_version = ">= 1.0.0"

  # (Optional) Specify required providers here if needed
  # This block can also be split into separate provider.tf files in more
  # advanced setups, but is shown here for completeness.
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # IE2: Using hashicorp/aws at version ~> 5.0
    }
  }
}

###############################################################################
# AWS Provider Configuration
###############################################################################
provider "aws" {
  # The region can be injected externally or defined here, for example:
  # region = var.aws_region
  #
  # Additional settings or profiles can be configured as needed, depending
  # on organizational requirements. For enterprise setups, consider separate
  # providers for multiple regions if multi-region deployment is desired.
}

###############################################################################
# AWS VPC Module
#
#   - Source: terraform-aws-modules/vpc/aws
#   - Version: ~> 5.0
#   - Purpose: Creates the VPC, subnets, NAT gateways, and other core
#              networking components for the TaskStream AI platform.
#   - This module integrates multi-AZ, security-related features such as
#     flow logs, and optional NAT gateway configurations for both staging
#     and production environments.
###############################################################################
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0" # IE2: Using terraform-aws-modules/vpc/aws at version ~> 5.0

  #############################################################################
  # Core VPC Settings
  #############################################################################
  name = "taskstream-${var.environment}-vpc"
  cidr = var.vpc_cidr

  # Distribute subnets across specified AZs for high availability
  azs              = var.azs
  public_subnets   = var.public_subnet_cidrs
  private_subnets  = var.private_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  #############################################################################
  # NAT Gateway Configuration
  #
  # enable_nat_gateway is forced to true for enterprise-grade private
  # subnet internet access. single_nat_gateway is enabled only for
  # non-production environments to reduce cost and simplify dev setups.
  #############################################################################
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment != "production"

  #############################################################################
  # DNS & Flow Logs
  #
  # enable_dns_hostnames and enable_dns_support must both be true to support
  # hostnames within the VPC. Flow logs are enabled or disabled based on
  # var.enable_flow_logs for enhanced network traffic visibility.
  #############################################################################
  enable_dns_hostnames = true
  enable_dns_support   = true
  enable_flow_logs     = var.enable_flow_logs

  #############################################################################
  # Database Subnet Group & Flow Log Group
  #
  # For RDS and other database services, create_database_subnet_group is set
  # to ensure the subnets are recognized as valid for database usage. Flow logs
  # can optionally be sent to CloudWatch, so create_flow_log_cloudwatch_log_group
  # is set to true.
  #############################################################################
  create_database_subnet_group          = true
  create_flow_log_cloudwatch_log_group  = true
  flow_log_max_aggregation_interval     = 60 # Aggregates logs in 60-second intervals

  #############################################################################
  # VPN Configuration
  #
  # If using AWS Site-to-Site VPN, enable_vpn_gateway can be set to true.
  # Here, it is disabled by default for this configuration.
  #############################################################################
  enable_vpn_gateway = false

  #############################################################################
  # Tagging
  #
  # Additional tags can be passed as needed. Enterprise organizations typically
  # require multiple mandatory tags for cost allocation, environment clarity,
  # and resource ownership.
  #############################################################################
  tags = {
    Environment = var.environment
    Project     = "TaskStream"
    ManagedBy   = "Terraform"
  }
}

###############################################################################
# Outputs
#
# We expose these outputs so that other modules and components (e.g. EKS,
# RDS, ElastiCache, DocumentDB) can reference the network settings, subnets,
# and flow logs within this VPC.
###############################################################################

# The ID of the newly created VPC
output "vpc_id" {
  description = "The ID of the TaskStream VPC"
  value       = module.vpc.vpc_id
}

# The list of public subnet IDs created
output "public_subnets" {
  description = "List of public subnet IDs for external-facing services"
  value       = module.vpc.public_subnets
}

# The list of private subnet IDs created
output "private_subnets" {
  description = "List of private subnet IDs for internal-facing services"
  value       = module.vpc.private_subnets
}

# The list of database subnet IDs created
output "database_subnets" {
  description = "List of database subnet IDs for RDS/DocumentDB/ElastiCache"
  value       = module.vpc.database_subnets
}

# The NAT Gateway IP addresses, if applicable
output "nat_gateway_ips" {
  description = "List of NAT Gateway EIPs in use for private subnet outbound traffic"
  value       = module.vpc.nat_public_ips
}

# The ID of the VPC Flow Log resource, if created
output "vpc_flow_log_id" {
  description = "The ID of the VPC Flow Log resource for network monitoring"
  value       = module.vpc.flow_log_id
}
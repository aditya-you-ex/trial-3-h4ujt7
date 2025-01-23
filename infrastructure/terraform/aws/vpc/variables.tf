###############################################################################
# Terraform Configuration
#
# This file declares all the variables required to provision the AWS VPC
# infrastructure of the TaskStream AI Platform, ensuring multi-AZ deployments,
# network security, and cloud infrastructure readiness.
#
# External Dependency:
# - hashicorp/terraform (v>=1.0.0) --> Used for core Terraform functionality.
###############################################################################

terraform {
  # We require Terraform v1.0.0 or higher for compatibility and best practices.
  required_version = ">= 1.0.0" # hashicorp/terraform v>=1.0.0
}

###############################################################################
# Variable: vpc_cidr
#
# Purpose:
#   Defines the primary CIDR block for the VPC.
#   Must be a valid IPv4 CIDR from /16 to /28 to ensure correct subnet sizing.
#
# Members:
#   - type: string
#   - description: Detailed overview of VPC CIDR constraints
#   - validation.block: Ensures pattern matching and correct subnet range
###############################################################################
variable "vpc_cidr" {
  type        = string
  description = "The CIDR block for the VPC (must be /16 to /28)"

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}(\\/)(16|17|18|19|20|21|22|23|24|25|26|27|28)$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block between /16 and /28."
  }
}

###############################################################################
# Variable: environment
#
# Purpose:
#   Specifies the environment name for resource isolation and tagging.
#   Typically one of: dev, staging, prod.
#
# Members:
#   - type: string
#   - description: Environment name (dev, staging, prod) for resource isolation
#   - validation.block: Restricts environment values to recognized types
###############################################################################
variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod) for resource isolation"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

###############################################################################
# Variable: azs
#
# Purpose:
#   List of availability zones for multi-AZ VPC deployment. Ensures high
#   availability and fault tolerance.
#
# Members:
#   - type: list(string)
#   - description: Availability zones used for subnet distribution
#   - validation.block: Validates that at least one AZ is provided
###############################################################################
variable "azs" {
  type        = list(string)
  description = "A list of availability zones to provision subnets within"

  validation {
    condition     = length(var.azs) >= 1
    error_message = "You must specify at least one availability zone."
  }
}

###############################################################################
# Variable: public_subnet_cidrs
#
# Purpose:
#   Defines the CIDR blocks for public subnets. There should be as many CIDR
#   blocks as availability zones if each AZ is to have a public subnet.
#
# Members:
#   - type: list(string)
#   - description: List of CIDR blocks for public subnets
#   - validation.block: Ensures the count matches the number of AZs
###############################################################################
variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets across each availability zone"

  validation {
    condition     = length(var.public_subnet_cidrs) == length(var.azs)
    error_message = "The number of public_subnet_cidrs must match the number of availability zones."
  }
}

###############################################################################
# Variable: private_subnet_cidrs
#
# Purpose:
#   Defines the CIDR blocks for private subnets. Parallel to public subnets,
#   this typically equals the number of AZs for a multi-AZ setup.
#
# Members:
#   - type: list(string)
#   - description: List of CIDR blocks for private subnets
#   - validation.block: Ensures the count matches the number of AZs
###############################################################################
variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets across each availability zone"

  validation {
    condition     = length(var.private_subnet_cidrs) == length(var.azs)
    error_message = "The number of private_subnet_cidrs must match the number of availability zones."
  }
}

###############################################################################
# Variable: database_subnet_cidrs
#
# Purpose:
#   Defines the CIDR blocks for database subnets. Typically these subnets are
#   isolated from direct internet access and used for persistent data stores.
#
# Members:
#   - type: list(string)
#   - description: List of CIDR blocks for database subnets
#   - validation.block: Ensures the count matches the number of AZs
###############################################################################
variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database subnets across each availability zone"

  validation {
    condition     = length(var.database_subnet_cidrs) == length(var.azs)
    error_message = "The number of database_subnet_cidrs must match the number of availability zones."
  }
}

###############################################################################
# Variable: enable_nat_gateway
#
# Purpose:
#   Boolean flag indicating whether to deploy a NAT Gateway for private
#   subnets to access the internet without exposing inbound traffic.
#
# Members:
#   - type: bool
#   - description: Flag to enable NAT Gateway
#   - default: false
###############################################################################
variable "enable_nat_gateway" {
  type        = bool
  description = "Flag to enable NAT Gateway for private subnet internet access"
  default     = false
}

###############################################################################
# Variable: single_nat_gateway
#
# Purpose:
#   Boolean flag indicating whether a single NAT Gateway should be used
#   instead of one NAT per AZ. Reduces cost, but can reduce redundancy.
#
# Members:
#   - type: bool
#   - description: Flag to use a single NAT Gateway
#   - default: false
###############################################################################
variable "single_nat_gateway" {
  type        = bool
  description = "Flag to use a single NAT Gateway instead of one per AZ"
  default     = false
}

###############################################################################
# Variable: enable_vpc_flow_logs
#
# Purpose:
#   Boolean flag indicating whether to enable VPC Flow Logs for network-level
#   monitoring, security analysis, and auditing.
#
# Members:
#   - type: bool
#   - description: Enable or disable VPC Flow Logs
#   - default: false
###############################################################################
variable "enable_vpc_flow_logs" {
  type        = bool
  description = "Flag to enable VPC flow logs for network monitoring"
  default     = false
}

###############################################################################
# Variable: tags
#
# Purpose:
#   A map of key-value tags for all resources, enabling cost allocation and
#   environment-specific resource management.
#
# Members:
#   - type: map(string)
#   - description: Common tags applied to AWS resources
#   - default: {}
###############################################################################
variable "tags" {
  type        = map(string)
  description = "Resource tags for cost allocation and resource management"
  default     = {}
}
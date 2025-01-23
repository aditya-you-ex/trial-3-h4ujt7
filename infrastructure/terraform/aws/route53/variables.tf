###############################################################################
# Terraform Variables for Route53 DNS Management
# Utilizing variable blocks from HashiCorp Terraform ~> 1.0
# This file defines all inputs required to manage Route53 resources,
# including public and private hosted zones, and global DNS support
# for the TaskStream AI platform. Comments are included extensively
# to clarify each variable's role, usage, and validation rules.
###############################################################################

###############################################################################
# Primary Domain Name Variable
# This variable represents the main domain name used to serve
# TaskStream AI’s public endpoints and core services. It must adhere
# to RFC 1035 naming conventions for DNS compliance.
###############################################################################
variable "domain_name" {
  # Declares that the variable must be a string
  type        = string

  # Provides a human-readable explanation of what this variable is used for
  description = "The primary domain name for the TaskStream AI platform's public services and endpoints. Must be a valid FQDN following DNS standards."

  # Enforces strict validation rules to ensure the supplied value is a proper DNS name
  validation {
    # Uses Terraform's built-in 'can' and 'regex' functions to confirm formatting
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    # Custom error message returned when the format check fails
    error_message = "Domain name must be a valid DNS name following RFC 1035 standards."
  }
}

###############################################################################
# Internal Domain Name Variable
# This variable sets the internal DNS domain to facilitate private
# service discovery among microservices within the TaskStream AI platform.
# It must also align with RFC 1035 naming to ensure resolvability.
###############################################################################
variable "internal_domain_name" {
  type        = string
  description = "The internal domain name for private service discovery and microservices communication within the TaskStream AI platform."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.internal_domain_name))
    error_message = "Internal domain name must be a valid DNS name following RFC 1035 standards."
  }
}

###############################################################################
# Environment Variable
# Identifies the environment in which resources will be deployed.
# Valid selections are strictly enforced to maintain consistent naming and
# tagging conventions across environments (development, staging, production).
###############################################################################
variable "environment" {
  type        = string
  description = "The deployment environment for the TaskStream AI platform (e.g., development, staging, production)."

  validation {
    # Ensures environment is one of the allowed values
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

###############################################################################
# Enable Private Zone Variable
# A boolean toggle to determine whether a private hosted zone should be
# created. Defaults to 'true' to facilitate internal DNS resolution for
# microservices. Can be disabled if a private zone is not needed.
###############################################################################
variable "enable_private_zone" {
  type        = bool
  description = "Flag to enable or disable the creation of a private hosted zone for internal service discovery."

  # Default is set to true for typical internal use-case scenarios
  default = true
}

###############################################################################
# Tags Variable
# Specifies a map of tags to be applied to Route53 resources for better
# organization, identification, and cost management. Defaults include
# references to the project name and Terraform usage.
###############################################################################
variable "tags" {
  type        = map(string)
  description = "A map of tags to be applied to all Route53 resources, aiding in cost allocation and resource management."

  # Provides default key-value pairs to ensure minimal baseline tagging
  default = {
    Terraform  = "true"
    Project    = "TaskStream AI"
    ManagedBy  = "terraform"
  }
}
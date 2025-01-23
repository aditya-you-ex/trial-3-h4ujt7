###############################################################################
# TaskStream AI - AWS OpenSearch Variables
#
# Description:
#   This Terraform variables configuration file defines the customizable
#   parameters for AWS OpenSearch domain provisioning and management.
#   It addresses search and analytics infrastructure (Elasticsearch/OpenSearch
#   8.0+ equivalency in AWS terms), analytics storage scaling, and security
#   requirements such as encryption at rest, node-to-node encryption, and
#   strict TLS policies. These variables can be adjusted per environment
#   (dev, staging, prod) to maintain consistent, enterprise-grade deployments.
#
# External Dependencies (IE2):
#   - hashicorp/terraform (~> 1.5): Core Terraform functionality for variable
#     definitions and validation blocks.
#
# Style (S1 & S2):
#   - Enterprise-grade coding style with extensive comments for clarity.
#   - Each variable block is documented with its purpose, type, default,
#     and validation constraints.
###############################################################################

terraform {
  required_version = "~> 1.5"
}

###############################################################################
# Variable: environment
# Purpose:
#   Specifies the environment context (e.g., dev, staging, or prod) for
#   organizing resources, tagging, and controlling domain names.
# Members Exposed (IE3):
#   - type: string
#   - description: A descriptive explanation of environment context
#   - validation.block: Restricts values to dev, staging, or prod
###############################################################################
variable "environment" {
  type        = string
  description = "Defines the environment context (dev, staging, or prod) for resource organization."

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of [dev, staging, prod]."
  }
}

###############################################################################
# Variable: engine_version
# Purpose:
#   Defines the AWS OpenSearch engine version with validation to ensure
#   compatibility of 8.0+ Elasticsearch-based features (AWS labels these as
#   OpenSearch_2.x). Default is 'OpenSearch_2.5' for alignment with recent
#   stable releases. For production, update to the latest version after
#   testing.
# Members Exposed (IE3):
#   - type: string
#   - description: Explanation of which versions are permissible
#   - default: A stable version (OpenSearch_2.5)
#   - validation.block: Ensures the version string matches a recognized
#     OpenSearch major release of 2.x or higher
###############################################################################
variable "engine_version" {
  type        = string
  description = "Specifies the Amazon OpenSearch engine version (e.g., OpenSearch_2.5). Must be 2.x or higher for 8.0+ features."
  default     = "OpenSearch_2.5"

  validation {
    condition = can(regex("^OpenSearch_2(\\.[0-9]+)?$", var.engine_version))
    error_message = "Engine version must be a string matching 'OpenSearch_2.x' (e.g., OpenSearch_2.5)."
  }
}

###############################################################################
# Variable: instance_type
# Purpose:
#   Defines the instance type for the OpenSearch data nodes. The type must be
#   a valid Amazon OpenSearch instance family (e.g. t3.small.search). Sizing
#   and performance should be determined by expected load, indexing rate,
#   and query throughput.
# Members Exposed (IE3):
#   - type: string
#   - description: Provides clarity on valid instance family suffix '.search'
#   - validation.block: Ensures correct Amazon OpenSearch instance naming
###############################################################################
variable "instance_type" {
  type        = string
  description = "Specifies the Amazon OpenSearch instance type (e.g., t3.small.search)."

  validation {
    condition     = can(regex("\\.search$", var.instance_type))
    error_message = "Instance type must end with '.search' (e.g., t3.small.search)."
  }
}

###############################################################################
# Variable: instance_count
# Purpose:
#   Defines the number of data nodes for the OpenSearch domain. Must meet
#   the minimum high availability requirement of at least two data nodes.
# Members Exposed (IE3):
#   - type: number
#   - description: Explanation of data node scaling for high availability
#   - validation.block: Ensures >=2 for redundancy
###############################################################################
variable "instance_count" {
  type        = number
  description = "Specifies the number of Amazon OpenSearch data nodes. Must be >= 2 for high availability."

  validation {
    condition     = var.instance_count >= 2
    error_message = "instance_count must be at least 2 for high availability."
  }
}

###############################################################################
# Variable: encryption_at_rest
# Purpose:
#   Enables or disables encryption at rest using AWS KMS or the AWS-managed
#   key (if no custom KMS Key ID is specified). This setting protects data
#   from unauthorized access at the disk layer.
# Members Exposed (IE3):
#   - type: bool
#   - description: Explanation of encryption at rest usage
#   - default: true
###############################################################################
variable "encryption_at_rest" {
  type        = bool
  description = "Enable (true) or disable (false) encryption at rest using AWS KMS."
  default     = true
}

###############################################################################
# Variable: kms_key_id
# Purpose:
#   Specifies a custom AWS KMS CMK (Customer Managed Key) for encryption
#   at rest. Leave as an empty string to use the AWS-managed key instead.
# Members Exposed (IE3):
#   - type: string
#   - description: Explanation of custom KMS Key usage in the domain
#   - default: empty string
###############################################################################
variable "kms_key_id" {
  type        = string
  description = "Optional KMS key for encryption at rest. Use an empty string to apply the AWS-managed key."
  default     = ""
}

###############################################################################
# Variable: node_to_node_encryption
# Purpose:
#   Enables or disables node-to-node (in-flight) encryption within the
#   OpenSearch cluster. Protects data traveling between data nodes from
#   unauthorized intercepts or snooping.
# Members Exposed (IE3):
#   - type: bool
#   - description: Explanation of HPC-level in-flight encryption
#   - default: true
###############################################################################
variable "node_to_node_encryption" {
  type        = bool
  description = "Enable (true) or disable (false) node-to-node encryption between OpenSearch nodes."
  default     = true
}

###############################################################################
# Variable: enforce_https
# Purpose:
#   Enforces the use of HTTPS for all domain endpoints. This helps ensure
#   data is encrypted in transit between clients and the OpenSearch domain.
# Members Exposed (IE3):
#   - type: bool
#   - description: Explanation of TLS enforcement
#   - default: true
###############################################################################
variable "enforce_https" {
  type        = bool
  description = "Enforce HTTPS for all OpenSearch domain endpoints."
  default     = true
}

###############################################################################
# Variable: tls_security_policy
# Purpose:
#   Defines the minimum TLS version accepted by the OpenSearch domain.
#   Example valid values include:
#     - Policy-Min-TLS-1-0-2019-07
#     - Policy-Min-TLS-1-2-2019-07
#     - Policy-Min-TLS-1-2-2021-06
# Members Exposed (IE3):
#   - type: string
#   - description: Explanation of supported TLS security policies
#   - default: A recommended baseline for enterprise compliance
###############################################################################
variable "tls_security_policy" {
  type        = string
  description = "Minimum TLS version policy for the OpenSearch domain endpoints."
  default     = "Policy-Min-TLS-1-2-2019-07"

  validation {
    condition = can(regex("^Policy-Min-TLS-(1-0|1-2)-(2019|2021)-\\d{2}$", var.tls_security_policy))
    error_message = "TLS security policy must match a recognized AWS OpenSearch format (e.g., Policy-Min-TLS-1-2-2021-06)."
  }
}
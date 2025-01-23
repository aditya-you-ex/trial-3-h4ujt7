###############################################################################
# TaskStream AI - AWS OpenSearch Infrastructure
#
# Description:
#   This Terraform configuration provisions and manages an AWS OpenSearch domain
#   for TaskStream AI, addressing search and analytics requirements with
#   high availability, security, and data node scaling. The configuration
#   includes node-to-node encryption, encryption at rest, fine-grained access
#   control, VPC-level isolation, and security group rules for a secure,
#   enterprise-ready deployment.
#
# Requirements Addressed:
#   1) Search and Analytics Infrastructure (Elasticsearch/OpenSearch 8.0+)
#   2) Analytics Storage (Data node scaling for high-volume analytics)
#   3) Infrastructure Security (Encryption, secure network access controls)
#
# External Dependencies (IE2):
#   - hashicorp/terraform (~> 1.5): Core Terraform functionality
#   - hashicorp/aws (~> 5.0): AWS provider to create OpenSearch resources
#
# Internal Imports (IE1):
#   - vpc_id from ../vpc/outputs.tf
#   - private_subnet_ids from ../vpc/outputs.tf
#
# Style (S1 & S2):
#   - Enterprise-grade coding style with extensive comments for maintainability.
#   - Every block is comprehensively detailed for production readiness.
###############################################################################

###############################################################################
# Terraform Block
# Purpose:
#   Specifies required Terraform version (>= 1.5) and the AWS provider version.
#   This ensures consistent, reproducible builds in enterprise environments.
###############################################################################
terraform {
  required_version = "~> 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

###############################################################################
# Data Source: terraform_remote_state (for VPC)
# Purpose:
#   Fetches outputs from the VPC module's state file, providing the VPC ID
#   and private subnet IDs. This design pattern is commonly used in larger
#   Terraform deployments where separate state files are maintained for
#   modular infrastructure layers (e.g., VPC, EKS, RDS).
#
# NOTE:
#   Adjust the backend configuration as appropriate for your environment:
#   local backend, remote backend (S3, Terraform Cloud), etc. The example
#   below references a file-based approach.
###############################################################################
data "terraform_remote_state" "vpc" {
  backend = "local"

  # "path" must match where the VPC module's state is stored.
  # In an enterprise environment, this could be in an S3 bucket or Terraform Cloud.
  config = {
    path = "../vpc/terraform.tfstate"
  }
}

###############################################################################
# Variable Declarations
# Purpose:
#   Encourages best practices by externalizing environment-specific details
#   (e.g., environment tags, advanced security credentials) that should not
#   be hardcoded. These variables can be injected via CLI, TFVars, or CI/CD.
###############################################################################
variable "environment" {
  type        = string
  description = "Specifies the environment for tagging and organization (e.g., dev, staging, prod)."
  default     = "dev"
}

variable "opensearch_master_user_name" {
  type        = string
  description = "Master user for OpenSearch fine-grained access control."
  default     = "admin"
}

variable "opensearch_master_user_password" {
  type        = string
  description = "Master user password for OpenSearch fine-grained access control. Store securely in KMS/Secrets Manager."
  default     = "ChangeMe123!"
  sensitive   = true
}

###############################################################################
# Resource: aws_security_group (OpenSearch)
# Purpose:
#   Creates a dedicated security group to control inbound and outbound network
#   traffic for the OpenSearch domain. Tightly restricting ingress traffic
#   mitigates unauthorized access risk to the search and analytics cluster.
#
# Exports (IE3):
#   1) name   (string)
#   2) vpc_id (string)
#   3) ingress (block)
#   4) egress  (block)
###############################################################################
resource "aws_security_group" "this" {
  name   = "taskstream-opensearch-sg-${var.environment}"
  vpc_id = data.terraform_remote_state.vpc.outputs.vpc_id

  ###########################################################################
  # Ingress Rules
  # - Allows inbound HTTPS (443) traffic from a restricted CIDR block.
  # - For production, reference an actual internal CIDR or another SG.
  ###########################################################################
  ingress {
    description      = "Allow inbound traffic on port 443 for OpenSearch HTTPS"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["10.0.0.0/16"]  # Placeholder for typical VPC range
  }

  ###########################################################################
  # Egress Rules
  # - Allows all outbound traffic (protocol = -1), enabling the domain to
  #   communicate with other internal/external resources as needed.
  ###########################################################################
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ###########################################################################
  # Tagging
  # - Attaches environment and application tags for cost allocation, resource
  #   tracking, and compliance with corporate tagging policies.
  ###########################################################################
  tags = {
    Name        = "taskstream-opensearch-sg-${var.environment}"
    Environment = var.environment
    Project     = "TaskStream"
  }
}

###############################################################################
# Resource: aws_opensearch_domain (main)
# Purpose:
#   Provisions an AWS OpenSearch domain (version 2.x) with multi-AZ support,
#   encryption, node-to-node security, EBS volumes, and advanced security
#   features. This aligns with TaskStream AI's data-intensive analytics
#   strategy and security posture.
#
# Exports (IE3):
#   1) domain_name                  (string)
#   2) engine_version              (string)
#   3) cluster_config              (block)
#   4) vpc_options                 (block)
#   5) ebs_options                 (block)
#   6) encrypt_at_rest             (block)
#   7) node_to_node_encryption     (block)
#   8) advanced_security_options   (block)
###############################################################################
resource "aws_opensearch_domain" "main" {
  ###########################################################################
  # Domain Name
  # - Identifies the AWS OpenSearch domain. Must be unique in the AWS account.
  # - Usually includes environment or region in real-world organizational
  #   naming conventions.
  ###########################################################################
  domain_name   = "taskstream-ai-${var.environment}"

  ###########################################################################
  # Engine Version
  # - Specifies the OpenSearch engine version. For enterprise usage,
  #   updating to the latest stable version ensures new features and security
  #   patches. The Terraform resource will handle version upgrades where possible.
  ###########################################################################
  engine_version = "OpenSearch_2.5"

  ###########################################################################
  # Cluster Configuration
  # - Configures instance type, instance count, and zone awareness for high
  #   availability. Dedicated master nodes enhance cluster stability,
  #   especially under load. Adjust instance sizing for production demands.
  ###########################################################################
  cluster_config {
    instance_type             = "t3.small.search"
    instance_count            = 2
    zone_awareness_enabled    = true
    zone_awareness_config {
      availability_zone_count = 2
    }

    dedicated_master_enabled   = true
    dedicated_master_count     = 3
    dedicated_master_type      = "t3.small.search"
  }

  ###########################################################################
  # VPC Options
  # - Deploys the domain into a VPC for network isolation and compliance.
  #   The domain will be accessible only within these private subnets or via
  #   peering/VPN/DirectConnect solutions.
  ###########################################################################
  vpc_options {
    subnet_ids         = data.terraform_remote_state.vpc.outputs.private_subnet_ids
    security_group_ids = [aws_security_group.this.id]
  }

  ###########################################################################
  # EBS Options
  # - Provisions EBS volumes to store data. "gp3" offers better performance
  #   and flexibility in sizing. Adjust volume_size for production scale.
  ###########################################################################
  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 50
  }

  ###########################################################################
  # Encryption at Rest
  # - Protects data on disk using AWS KMS. If a specific KMS key is required,
  #   set 'kms_key_id' accordingly. By default, AWS-managed keys are used.
  ###########################################################################
  encrypt_at_rest {
    enabled    = true
    kms_key_id = null
  }

  ###########################################################################
  # Node-to-Node Encryption
  # - Ensures traffic within the cluster is encrypted, preventing
  #   unauthorized snooping between nodes.
  ###########################################################################
  node_to_node_encryption {
    enabled = true
  }

  ###########################################################################
  # Advanced Security Options
  # - Enables fine-grained access control, internal user database (default
  #   for admin user), and encryption for compliance with enterprise
  #   security requirements.
  # - Master user credentials are managed via Terraform variables for
  #   demonstration. In production, consider AWS Secrets Manager or SSM.
  ###########################################################################
  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = var.opensearch_master_user_name
      master_user_password = var.opensearch_master_user_password
    }
  }

  ###########################################################################
  # Tagging
  # - Essential for cost allocation, customized reporting, and environment
  #   governance. Additional organizational tags can be added as needed.
  ###########################################################################
  tags = {
    Application = "TaskStreamAI"
    Environment = var.environment
    Project     = "TaskStream"
  }
}
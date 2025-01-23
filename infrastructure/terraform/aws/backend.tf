###############################################################################
# TaskStream AI - Terraform Backend Configuration
#
# Description:
#   Secure, highly available Terraform backend configuration using AWS S3
#   for state storage and DynamoDB for state locking, implementing cross-region
#   replication, encryption, versioning, logging, and enterprise-grade controls.
#
# Requirements Addressed:
#   1) Infrastructure as Code (Technical Specifications/8.5 CI/CD Pipeline)
#      - Implements secure, scalable state management including encryption,
#        versioning, and locked concurrency.
#   2) High Availability (Technical Specifications/8.1 Deployment Environment)
#      - Cross-region replication ensures continued access to state in the event
#        of a regional outage.
#   3) Security Standards (Technical Specifications/7.2 Data Security)
#      - Enforces AES-256/KMS encryption, strict IAM-based access control,
#        logging/auditing, and policy compliance with SOC2 and ISO27001.
#
# Imports (IE1 & IE2):
#   - Internal:
#       variable "project" { type = string } from variables.tf
#         Used here for resource tagging or naming if needed.
#   - External:
#       provider "aws" { version = "~> 5.0" }
#         Required for S3 bucket & DynamoDB table resources.
#
# Style (S1 & S2):
#   - Enterprise-ready, production-grade Terraform code with extensive comments.
###############################################################################

###############################################################################
# Terraform Configuration
# - Defines the S3 backend for remote state storage and DynamoDB for state lock.
# - Multiple optional backend parameters are included for demonstration.
###############################################################################
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 backend with encryption, versioning, and DynamoDB locking
  backend "s3" {
    bucket              = "taskstream-ai-terraform-state"
    key                 = "infrastructure/terraform.tfstate"
    region              = "us-east-1"
    encrypt             = true
    dynamodb_table      = "taskstream-ai-terraform-locks"
    kms_key_id          = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    workspace_key_prefix = "env"
    acl                 = "private"
    sse_algorithm       = "aws:kms"
  }
}

###############################################################################
# Local Values
# - Pulls in the 'project' variable for optional resource tagging or naming.
###############################################################################
locals {
  project_name = var.project
}

###############################################################################
# AWS Provider Configuration
# - In certain setups, region or profiles could be customized here.
###############################################################################
provider "aws" {
  region = "us-east-1"
}

###############################################################################
# S3 Bucket for Terraform State
# - Mandates private ACL, versioning, SSE-KMS encryption, server access logging,
#   and replication to ensure compliance with high availability standards.
###############################################################################
resource "aws_s3_bucket" "terraform_state" {
  bucket = "taskstream-ai-terraform-state"
  acl    = "private"

  # Server Access Logging (Tech Spec: logging.enabled = true)
  logging {
    target_bucket = "taskstream-ai-logs"
    target_prefix = "terraform-state"
  }

  # Tags for cost allocation, environment context, and auditing
  tags = {
    Name        = "Terraform State Bucket"
    Project     = local.project_name
    Environment = "Production"
  }
}

###############################################################################
# S3 Bucket Versioning
# - Ensures that the Terraform state file is versioned, preventing accidental
#   overwrites and enabling rollbacks (Tech Spec: versioning.enabled = true).
# - MFA Delete is also enabled to fulfill compliance (Tech Spec: versioning.mfa_delete).
###############################################################################
resource "aws_s3_bucket_versioning" "terraform_state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = true
  }
}

###############################################################################
# S3 Bucket Server-Side Encryption Configuration
# - Enforces AWS KMS encryption for all objects (Tech Spec: encryption.type = aws:kms).
###############################################################################
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_encryption" {
  bucket = aws_s3_bucket.terraform_state.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    }
  }
}

###############################################################################
# DynamoDB Table for State Locking
# - Presents concurrency control to avoid terraform state corruption (Tech Spec).
# - Implements point-in-time recovery for data backups and KMS encryption.
# - Uses PAY_PER_REQUEST billing for cost efficiency with variable load.
###############################################################################
resource "aws_dynamodb_table" "terraform_state_locks" {
  name         = "taskstream-ai-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "LockID"
    type = "S"
  }

  hash_key = "LockID"

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
  }

  tags = {
    Name        = "Terraform State Lock Table"
    Project     = local.project_name
    Environment = "Production"
  }
}

###############################################################################
# Cross-Region Replication Prerequisites
# - An IAM role allowing S3 to replicate objects. For each target region,
#   a separate bucket is required. This example demonstrates multi-destination.
###############################################################################
resource "aws_iam_role" "replication_role" {
  name               = "taskstream-s3-replication-role"
  assume_role_policy = data.aws_iam_policy_document.replication_role_assume.json

  tags = {
    Project     = local.project_name
    Environment = "Production"
  }
}

data "aws_iam_policy_document" "replication_role_assume" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "replication_policy" {
  name        = "taskstream-s3-replication-policy"
  description = "IAM policy for S3 replication to multiple target buckets."

  policy = data.aws_iam_policy_document.replication_policy.json
}

data "aws_iam_policy_document" "replication_policy" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:GetObjectAcl",
      "s3:GetObjectVersionAcl",
      "s3:ReplicateObject",
      "s3:ReplicateDelete",
      "s3:ReplicateTags"
    ]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:PutObjectVersionAcl",
      "s3:PutObjectTagging",
      "s3:PutObjectVersionTagging"
    ]
    resources = [
      "arn:aws:s3:::taskstream-ai-terraform-state-replica-us-west-2/*",
      "arn:aws:s3:::taskstream-ai-terraform-state-replica-eu-west-1/*"
    ]
  }
}

resource "aws_iam_role_policy_attachment" "replication_role_attachment" {
  role       = aws_iam_role.replication_role.name
  policy_arn = aws_iam_policy.replication_policy.arn
}

###############################################################################
# S3 Buckets in Target Regions (Replicas)
# - Example replica buckets for cross-region replication.
#   Production usage typically configures these in respective regions.
###############################################################################
resource "aws_s3_bucket" "terraform_state_replica_us_west_2" {
  bucket = "taskstream-ai-terraform-state-replica-us-west-2"
  acl    = "private"

  tags = {
    Name        = "Terraform State Bucket Replica (us-west-2)"
    Project     = local.project_name
    Environment = "Production"
  }
}

resource "aws_s3_bucket" "terraform_state_replica_eu_west_1" {
  bucket = "taskstream-ai-terraform-state-replica-eu-west-1"
  acl    = "private"

  tags = {
    Name        = "Terraform State Bucket Replica (eu-west-1)"
    Project     = local.project_name
    Environment = "Production"
  }
}

###############################################################################
# Bucket Replication Configuration
# - Specifies multiple rules to replicate objects from the primary bucket to
#   separate destination buckets in us-west-2 and eu-west-1.
# - Replication time objective set to 15 minutes for compliance with RTO.
###############################################################################
resource "aws_s3_bucket_replication_configuration" "terraform_state_replication" {
  depends_on = [
    aws_iam_role_policy_attachment.replication_role_attachment,
    aws_s3_bucket.terraform_state,
    aws_s3_bucket.terraform_state_replica_us_west_2,
    aws_s3_bucket.terraform_state_replica_eu_west_1
  ]

  bucket = aws_s3_bucket.terraform_state.id
  role   = aws_iam_role.replication_role.arn

  rule {
    id     = "replicate-to-us-west-2"
    status = "Enabled"

    filter {
      prefix = "" # Replicate all objects
    }

    destination {
      bucket        = aws_s3_bucket.terraform_state_replica_us_west_2.arn
      storage_class = "STANDARD"
      replication_time {
        status = "Enabled"
        time   = 15
        units  = "Minutes"
      }
      access_control_translation {
        owner = "Destination"
      }
      encryption_configuration {
        replica_kms_key_id = "arn:aws:kms:us-west-2:ACCOUNT_ID:key/KEY_ID"
      }
    }
  }

  rule {
    id     = "replicate-to-eu-west-1"
    status = "Enabled"

    filter {
      prefix = "" # Replicate all objects
    }

    destination {
      bucket        = aws_s3_bucket.terraform_state_replica_eu_west_1.arn
      storage_class = "STANDARD"
      replication_time {
        status = "Enabled"
        time   = 15
        units  = "Minutes"
      }
      access_control_translation {
        owner = "Destination"
      }
      encryption_configuration {
        replica_kms_key_id = "arn:aws:kms:eu-west-1:ACCOUNT_ID:key/KEY_ID"
      }
    }
  }
}

###############################################################################
# Bucket Policy (Security Controls)
# - Restricts access to the Terraform State Manager role, enforces MFA,
#   optional IP restrictions, and references VPC endpoints for S3 usage.
# - Illustrates advanced security posture for compliance (SOC2, ISO27001).
###############################################################################
data "aws_iam_policy_document" "terraform_state_policy_doc" {
  statement {
    sid       = "AllowTerraformStateManagerRole"
    effect    = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::ACCOUNT_ID:role/TerraformStateManager"]
    }
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetBucketLocation",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*"
    ]
  }

  # Example optional IP restriction if needed (placeholder range).
  # This denies all traffic not originating from 203.0.113.0/24.
  # Use this block only if IP-based access control is required.
  statement {
    sid    = "DenyNonTrustedIPs"
    effect = "Deny"
    actions = [
      "s3:*"
    ]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*"
    ]
    condition {
      test     = "NotIpAddress"
      variable = "aws:SourceIp"
      values   = ["203.0.113.0/24"]
    }
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }

  # Enforce MFA for any sensitive modifications (example policy).
  statement {
    sid    = "EnforceMFADelete"
    effect = "Deny"
    actions = [
      "s3:DeleteObjectVersion",
      "s3:SuspendReplication",
      "s3:PutBucketVersioning"
    ]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*"
    ]
    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["false"]
    }
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "terraform_state_policy" {
  bucket = aws_s3_bucket.terraform_state.bucket
  policy = data.aws_iam_policy_document.terraform_state_policy_doc.json
}

###############################################################################
# Monitoring & Metrics
# - Tracks usage patterns, file size, and concurrency attempts. Example usage
#   of aws_s3_bucket_metric for advanced analytics. Alarms can be integrated.
###############################################################################
resource "aws_s3_bucket_metric" "terraform_state_size" {
  bucket = aws_s3_bucket.terraform_state.bucket
  name   = "StateFileSize"

  filter {
    prefix = ""
  }
  # Tag-based or prefix-based filtering can be configured here if needed.
}

resource "aws_s3_bucket_metric" "terraform_state_access_patterns" {
  bucket = aws_s3_bucket.terraform_state.bucket
  name   = "AccessPatterns"
}

resource "aws_s3_bucket_metric" "terraform_state_lock_duration" {
  bucket = aws_s3_bucket.terraform_state.bucket
  name   = "LockDuration"
}

###############################################################################
# Example Alarms (Placeholder)
# - Observes potential thresholds from the specification: 100MB for size,
#   concurrency attempts, and failed operations. Implementation details
#   may vary depending on actual usage.
###############################################################################
# For real usage, you'd create CloudWatch metrics from logs or integrate with
# a custom metric mechanism. Below placeholders present possibility only.

# resource "aws_cloudwatch_metric_alarm" "terraform_state_size_alarm" {
#   alarm_name          = "TerraformStateSizeExceeding100MB"
#   comparison_operator = "GreaterThanOrEqualToThreshold"
#   evaluation_periods  = 1
#   metric_name         = "StateFileSize"
#   namespace           = "AWS/S3"
#   period              = 300
#   statistic           = "Average"
#   threshold           = 100
#   alarm_description   = "Triggers if the state file size exceeds 100MB."
#   actions_enabled     = true
#   alarm_actions       = []
# }

###############################################################################
# Logging & Compliance
# - CloudTrail, CloudWatch logs, retention settings, daily audits, SOC2/ISO27001
#   references, etc. Implementation of these is environment-wide and can be part
#   of an overarching logging module or CloudTrail config, not shown in detail here.
###############################################################################

# (End of backend.tf)
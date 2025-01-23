##############################################################################
# TaskStream AI - EKS Outputs
#
# Description:
#   Terraform outputs definition file that exposes essential information about
#   the provisioned AWS EKS cluster for the TaskStream AI platform, including
#   cluster identifiers, endpoints, security configurations, and IAM roles
#   with enhanced security controls and encryption standards.
#
# Requirements Addressed:
#   1) Container Orchestration (Multi-region AWS Deployment)
#   2) Kubernetes Infrastructure (Expose cluster data for deployment & security)
#   3) Security Requirements (Enhanced security controls & encryption)
#
# Imports and References:
#   - IE1: Internal reference to aws_eks_cluster.main and aws_eks_node_group.main
#          declared in main.tf within this AWS/EKS module.
#   - IE2: AWS Provider (hashicorp/aws ~> 5.0) used to access advanced EKS features.
##############################################################################

##############################################################################
# Output: cluster_id
# Purpose:
#   Exports the unique identifier (ID) of the EKS cluster for resource
#   tracking, referencing, and external integrations. It is typically the same
#   value as 'name' for aws_eks_cluster, enabling consistent usage in naming
#   conventions and cluster-based orchestrations.
##############################################################################
output "cluster_id" {
  description = "The unique identifier of the EKS cluster for resource tracking and management"
  value       = aws_eks_cluster.main.id
  sensitive   = false
}

##############################################################################
# Output: cluster_endpoint
# Purpose:
#   Exposes the fully qualified API server endpoint for the EKS cluster.
#   Clients and administrators use this endpoint to interact securely with
#   the cluster for Kubernetes operations (e.g., kubectl, GitOps pipelines).
##############################################################################
output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server with secure access"
  value       = aws_eks_cluster.main.endpoint
  sensitive   = false
}

##############################################################################
# Output: cluster_certificate_authority_data
# Purpose:
#   Provides the base64-encoded certificate authority data for the EKS cluster,
#   verifying authenticity of the EKS API server. Marked as sensitive to
#   prevent accidental exposure, meeting advanced encryption & security policies.
##############################################################################
output "cluster_certificate_authority_data" {
  description = "The base64 encoded certificate authority data for secure cluster authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

##############################################################################
# Output: cluster_security_group_id
# Purpose:
#   Identifies the cluster security group automatically managed by EKS,
#   facilitating network relations between control plane and node groups.
#   Used for configuring additional ingress/egress rules or referencing
#   advanced network policies.
##############################################################################
output "cluster_security_group_id" {
  description = "The ID of the EKS cluster security group for network access control"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  sensitive   = false
}

##############################################################################
# Output: cluster_iam_role_arn
# Purpose:
#   ARN of the IAM role that the EKS cluster uses to interact with AWS services
#   securely. Marked as sensitive to minimize the role's direct exposure. This
#   role typically allows provisioning, scaling, and managing underlying
#   Kubernetes resources.
##############################################################################
output "cluster_iam_role_arn" {
  description = "The ARN of the IAM role used by the EKS cluster for access management"
  value       = aws_eks_cluster.main.role_arn
  sensitive   = true
}

##############################################################################
# Output: node_groups
# Purpose:
#   Exports a map of all EKS node group resources, enabling referencing of
#   desired/minimum/maximum capacities, instance types, and specialized
#   configurations. Facilitates monitoring, scaling, and resource alignment
#   for the TaskStream AI platform's workloads.
##############################################################################
output "node_groups" {
  description = "Map of all EKS node groups with their configurations and scaling parameters"
  value       = aws_eks_node_group.main
  sensitive   = false
}
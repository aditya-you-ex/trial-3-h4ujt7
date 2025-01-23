###############################################################################
# TaskStream AI - AWS IAM Outputs
#
# Description:
#   This Terraform outputs definition file for AWS IAM roles, policies, and
#   permissions required by TaskStream AI's microservices architecture.
#   It grants secure, least-privilege access while meeting SOC 2 Type II
#   compliance requirements. Specifically, it exposes:
#
#     1) cluster_role_arn: ARN of the IAM role for the EKS control plane.
#     2) node_role_arn: ARN of the IAM role for EKS worker nodes.
#     3) service_account_role_arns: Map of Kubernetes service account names
#        to their IAM role ARNs, implementing IRSA for granular access control.
#
# References:
#   - aws_iam_role.cluster_role        (main.tf)
#   - aws_iam_role.node_role           (main.tf)
#   - aws_iam_role.service_account_roles (main.tf)
#
# Outputs:
#   cluster_role_arn          -> EKS cluster role ARN
#   node_role_arn             -> EKS node role ARN
#   service_account_role_arns -> Map of IRSA service account role ARNs
#
# Compliance & Security:
#   - Ensures adherence to least privilege principles and SOC 2 Type II
#     requirements by exposing only non-sensitive ARNs for roles.
###############################################################################

###############################################################################
# Output: cluster_role_arn
# ---------------------------------------------------------------------------
# Purpose:
#   Exports the ARN of the IAM role used by the EKS cluster for essential
#   cluster management operations. This role is designed with the principle
#   of least privilege, granting only the necessary permissions to manage
#   Kubernetes control plane operations, and meets SOC 2 Type II compliance
#   by providing detailed auditing capabilities. 
###############################################################################
output "cluster_role_arn" {
  description = "ARN of the IAM role used by the EKS cluster for cluster management operations. This role follows least privilege principles and is compliant with SOC 2 Type II requirements."
  value       = aws_iam_role.cluster_role.arn
  sensitive   = false
}

###############################################################################
# Output: node_role_arn
# ---------------------------------------------------------------------------
# Purpose:
#   Exports the ARN of the IAM role used by EKS node groups for EC2 instance
#   operations. This role contains only the required AWS service permissions
#   to manage and run containers on behalf of the EKS worker nodes, adhering
#   to best practices for container security and isolation. It supports SOC 2
#   Type II standards by enabling fine-grained logging and traceability.
###############################################################################
output "node_role_arn" {
  description = "ARN of the IAM role used by EKS node groups for EC2 instance operations. This role provides necessary permissions for container operations while maintaining security best practices."
  value       = aws_iam_role.node_role.arn
  sensitive   = false
}

###############################################################################
# Output: service_account_role_arns
# ---------------------------------------------------------------------------
# Purpose:
#   Exports a map of Kubernetes service account names to their corresponding
#   IAM role ARNs, enabling IAM Roles for Service Accounts (IRSA). This
#   approach supports pod-level security with granular access control,
#   preventing unnecessary permissions spread across the cluster. Aligned
#   with SOC 2 Type II and ISO 27001, this ensures robust auditing and
#   compliance by binding each service account to its own least-privilege
#   IAM role.
###############################################################################
output "service_account_role_arns" {
  description = "Map of service account names to their IAM role ARNs for IRSA implementation. Enables pod-level IAM authentication and authorization with granular access control."
  value       = { for k, v in aws_iam_role.service_account_roles : k => v.arn }
  sensitive   = false
}
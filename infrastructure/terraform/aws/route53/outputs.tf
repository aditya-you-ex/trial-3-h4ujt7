###############################################################################
# TaskStream AI - Route53 Outputs
#
# Description:
#   This Terraform configuration file defines output blocks that expose critical
#   identifiers and DNS name servers for public and private Route53 hosted zones
#   within the TaskStream AI platform. These outputs are consumed by other
#   Terraform configurations or external systems to facilitate domain management,
#   multi-region deployment, and DNS resolution strategies in production.
#
# Requirements Addressed:
#   - DNS Management (Ref: Technical Specifications/8.2 Cloud Services):
#     Exposes zone IDs and name servers for comprehensive DNS configuration
#     with AWS Route53.
#   - Global Infrastructure (Ref: Technical Specifications/8.1 Deployment Environment):
#     Supports multi-region deployment where the public hosted zone is used
#     externally and the private hosted zone is optionally used for internal
#     VPC-based DNS resolution.
#
# Third-Party Provider Version (IE2):
#   - hashicorp/terraform ~> 1.0
#   - hashicorp/aws ~> 5.0
###############################################################################

###############################################################################
# Output: public_zone_id
# -----------------------------------------------------------------------------
# Purpose:
#   Provides the Route53 public hosted zone ID used to manage public DNS records
#   for external-facing TaskStream AI services. This output is integral for
#   multi-region, latency-based DNS routing, or for integrating with other AWS
#   services (e.g., AWS Certificate Manager) that require a hosted zone ID.
#
# Members Exposed (LD1):
#   1. value       - The ID of the public hosted zone, referencing the
#                    aws_route53_zone.public resource's zone_id.
#   2. description - Human-readable description for clarity in enterprise
#                    Terraform modules and documentation.
#
# Implementation Completeness (LD2):
#   - This output is fully implemented and references the existing public zone
#     defined in the main.tf file, ensuring production readiness.
###############################################################################
output "public_zone_id" {
  description = "The ID of the public Route53 hosted zone for external DNS resolution"
  value       = aws_route53_zone.public.zone_id
  # For zone IDs, sensitive is typically false since they are not secret keys
  sensitive   = false
}

###############################################################################
# Output: public_name_servers
# -----------------------------------------------------------------------------
# Purpose:
#   Exports the authoritative name servers (NS records) of the public hosted zone,
#   allowing domain registrars to delegate authoritative DNS to AWS Route53 for
#   the TaskStream AI platform. These name servers also enable external clients
#   and users to properly resolve TaskStream domain names.
#
# Members Exposed (LD1):
#   1. value       - The list of name server addresses, referencing
#                    aws_route53_zone.public.name_servers (list of strings).
#   2. description - Provides clarity on the list’s purpose, essential for domain
#                    registrar setup and DNS propagation management.
#
# Implementation Completeness (LD2):
#   - This output fully exposes public name servers from the resource definition
#     and is ready for consumption by domain registration processes.
###############################################################################
output "public_name_servers" {
  description = "The authoritative name servers for the public Route53 hosted zone"
  value       = aws_route53_zone.public.name_servers
  sensitive   = false
}

###############################################################################
# Output: private_zone_id
# -----------------------------------------------------------------------------
# Purpose:
#   Exposes the ID of the private Route53 hosted zone used for internal DNS
#   resolution within the VPC, enabling secure service discovery among
#   microservices in the TaskStream AI platform. This output may be null if the
#   private zone was not created (i.e., var.enable_private_zone is false).
#
# Members Exposed (LD1):
#   1. value       - Conditionally references aws_route53_zone.private[0].zone_id
#                    when the private zone resource is present, else returns null.
#   2. description - Describes the usage and clarifies that it is only relevant
#                    if the private zone is enabled in this environment.
#
# Implementation Completeness (LD2):
#   - Includes complete logic to handle the absence or presence of the private
#     hosted zone. Ensures robust, production-ready behavior even in non-private
#     zone environments.
###############################################################################
output "private_zone_id" {
  description = "The ID of the private Route53 hosted zone for internal VPC DNS resolution"
  value       = length(aws_route53_zone.private) > 0 ? aws_route53_zone.private[0].zone_id : null

  # The depends_on attribute ensures Terraform processes creation of the private
  # zone resource (if any) before evaluating the output. If no private zone is
  # created, the value resolves to null safely, handling count=0 scenarios.
  depends_on = [
    aws_route53_zone.private
  ]

  sensitive = false
}
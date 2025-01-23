###############################################################################
# TaskStream AI - VPC Outputs
#
# Description:
#   This file exports critical network infrastructure identifiers from the
#   AWS VPC module so other Terraform components—such as EKS, RDS, or
#   ElastiCache—can properly integrate. These outputs are essential for
#   multi-AZ networking, access control, and cloud infrastructure setup.
#
# External Dependency (IE2):
#   - hashicorp/terraform (v>=1.0.0): Core Terraform functionality for
#     output definition and interpolation.
#
# Internal Import (IE1):
#   - module.vpc (from vpc/main.tf): Provides named outputs such as vpc_id,
#     public_subnets, private_subnets, database_subnets, database_subnet_group,
#     and nat_public_ips, all used below.
#
# Style (S1 & S2):
#   - Enterprise-ready coding style with extensive comments for maintainability.
#   - Outputs fully documented with descriptions for clarity in production.
###############################################################################

###############################################################################
# Export: vpc_id
# Purpose:
#   Exports the ID of the created VPC for use in security groups, routing,
#   and service deployment across multi-AZ environments. Central to enabling
#   connectivity for AWS services requiring a VPC reference.
###############################################################################
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

###############################################################################
# Export: public_subnet_ids
# Purpose:
#   Exports the IDs of all public subnets within the VPC, enabling deployments
#   of internet-facing services like Application Load Balancers and NAT
#   Gateways. Critical for multi-AZ infrastructure supporting high availability.
###############################################################################
output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

###############################################################################
# Export: private_subnet_ids
# Purpose:
#   Exports the IDs of private subnets within the VPC, where core application
#   services such as EKS workloads, microservices, and internal workloads
#   reside. Ensures restricted access and improved security posture.
###############################################################################
output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

###############################################################################
# Export: database_subnet_ids
# Purpose:
#   Exports the IDs of the database subnets specifically configured for
#   persistence layers like RDS and ElastiCache. Ensures tight isolation
#   for data services and compliance with enterprise data policies.
###############################################################################
output "database_subnet_ids" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

###############################################################################
# Export: database_subnet_group_name
# Purpose:
#   Provides the name of the database subnet group required by AWS database
#   services such as RDS instances. Facilitates constraints on which subnets
#   can host database resources, enhancing security and fault tolerance.
###############################################################################
output "database_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = module.vpc.database_subnet_group
}

###############################################################################
# Export: nat_public_ips
# Purpose:
#   Exports the public Elastic IP addresses allocated for NAT Gateways. Used
#   for outbound internet connectivity from private subnets while preventing
#   inbound traffic, crucial for secure and maintainable network design.
###############################################################################
output "nat_public_ips" {
  description = "List of public Elastic IPs created for NAT gateways"
  value       = module.vpc.nat_public_ips
}
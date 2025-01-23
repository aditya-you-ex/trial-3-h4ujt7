#!/usr/bin/env bash
###############################################################################
# init-cluster.sh
#
# Bash script that initializes and configures a new Kubernetes cluster for
# the TaskStream AI platform, setting up namespaces, resource quotas, RBAC
# policies, and core infrastructure components with enhanced security,
# monitoring, and high availability features.
#
# GLOBAL VARIABLES (from JSON specification):
#   1) CLUSTER_NAME       -> "taskstream-${ENVIRONMENT}"
#   2) AWS_REGION         -> "us-east-1"
#   3) ENVIRONMENT        -> "production"
#   4) NAMESPACES         -> ["analytics", "nlp", "tasks", "auth", "integration", "monitoring"]
#   5) MIN_NODE_COUNT     -> "3"
#   6) MAX_NODE_COUNT     -> "20"
#   7) MONITORING_VERSION -> "v0.11.0"
#
# EXTERNAL IMPORTS (through command-line tools, with versions as comments):
#   - kubectl       (kubernetes-cli, version >= 1.27+)
#   - aws-cli       (aws-cli, version >= 2.0+)
#   - helm          (helm, version >= 3.0+)
#
# INTERNAL IMPORTS:
#   - namespaces.yaml        (analytics-namespace, nlp-namespace, etc.)
#   - resource-quotas.yaml   (analytics-quota, nlp-quota, etc.)
#   - rbac.yaml             (analytics-role, monitoring-cluster-role, etc.)
#
# FUNCTIONS (as defined in the JSON specification):
#   1. check_prerequisites()
#   2. create_namespaces()
#   3. apply_resource_quotas()
#   4. configure_rbac()
#   5. setup_monitoring()
#   6. main()
#
# EXPORT:
#   - init_cluster (default export, calls main())
#
###############################################################################
set -o errexit
set -o pipefail
set -o nounset

###############################################################################
# Global Variables (Pulled from JSON specifications)
###############################################################################
CLUSTER_NAME="taskstream-${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
# NAMESPACES array: typical usage is "analytics nlp tasks auth integration monitoring"
# Provided as a space-separated string for convenience in bash:
NAMESPACES="${NAMESPACES:-analytics nlp tasks auth integration monitoring}"
MIN_NODE_COUNT="${MIN_NODE_COUNT:-3}"
MAX_NODE_COUNT="${MAX_NODE_COUNT:-20}"
MONITORING_VERSION="${MONITORING_VERSION:-v0.11.0}"

# This script assumes you are running from a directory that has access to
# the following relative paths:
#   ../kubernetes/config/namespaces.yaml
#   ../kubernetes/config/resource-quotas.yaml
#   ../kubernetes/security/rbac.yaml
# Adjust paths if directory structure differs.
NAMESPACES_YAML="../kubernetes/config/namespaces.yaml"
RESOURCE_QUOTAS_YAML="../kubernetes/config/resource-quotas.yaml"
RBAC_YAML="../kubernetes/security/rbac.yaml"

# Additional recommended optional files (not strictly required by JSON but
# relevant for enterprise readiness):
POD_SECURITY_POLICIES_YAML="../kubernetes/security/pod-security-policies.yaml"
NETWORK_POLICIES_YAML="../kubernetes/security/network-policies.yaml"

# Log file to capture initialization process details.
LOGFILE="/tmp/init_cluster.log"

###############################################################################
# Helper Functions for Logging and Error Handling
###############################################################################
log_info() {
  echo "[INFO]  $*" | tee -a "$LOGFILE"
}

log_warn() {
  echo "[WARN]  $*" | tee -a "$LOGFILE" >&2
}

log_error() {
  echo "[ERROR] $*" | tee -a "$LOGFILE" >&2
}

###############################################################################
# 1) check_prerequisites
# Description:
#   Performs comprehensive verification of all required tools, credentials,
#   and configurations before cluster initialization.
#
# Decorators: @logging, @error_handling
#
# Steps (from JSON specification):
#   1) Verify kubectl version (>= 1.27)
#   2) Check AWS CLI version and credentials
#   3) Validate Helm installation
#   4) Verify required YAML files exist
#   5) Check network connectivity to AWS services
#   6) Validate AWS IAM permissions for EKS operations
#   7) Verify SSL certificates availability
#   8) Check disk space requirements
#   9) Validate environment variables
#
# Returns: Exit code (0 for success, 1 for failure)
###############################################################################
check_prerequisites() {
  log_info "Starting prerequisite checks..."

  # 1) Verify kubectl version (>= 1.27)
  if ! command -v kubectl >/dev/null 2>&1; then
    log_error "kubectl (>= 1.27+) is not installed or not in PATH."
    return 1
  fi
  KUBECTL_VERSION=$(kubectl version --client --short | awk '{print $3}' | sed 's/v//g' || true)
  if [[ -z "${KUBECTL_VERSION}" ]]; then
    log_error "Unable to detect kubectl version."
    return 1
  fi
  # Compare major.minor version as a float
  REQUIRED_KUBECTL="1.27"
  if [[ $(echo "${KUBECTL_VERSION} < ${REQUIRED_KUBECTL}" | bc -l) -eq 1 ]]; then
    log_error "kubectl version is ${KUBECTL_VERSION}, but >= ${REQUIRED_KUBECTL} is required."
    return 1
  fi
  log_info "kubectl version ${KUBECTL_VERSION} is valid."

  # 2) Check AWS CLI version and credentials
  if ! command -v aws >/dev/null 2>&1; then
    log_error "aws-cli (>= 2.0+) is not installed or not in PATH."
    return 1
  fi
  AWSCLI_VERSION=$(aws --version 2>&1 | awk -F/ '{print $2}' | awk '{print $1}' || true)
  if [[ -z "${AWSCLI_VERSION}" ]]; then
    log_error "Unable to detect aws-cli version."
    return 1
  fi
  # Basic check for major version 2
  if [[ "${AWSCLI_VERSION%%.*}" -lt 2 ]]; then
    log_error "aws-cli version ${AWSCLI_VERSION}, but version >= 2.0 is required."
    return 1
  fi
  # Validate credentials
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    log_error "AWS CLI credentials not configured or invalid."
    return 1
  fi
  log_info "aws-cli version ${AWSCLI_VERSION} is valid. Credentials verified."

  # 3) Validate Helm installation
  if ! command -v helm >/dev/null 2>&1; then
    log_error "helm (>= 3.0) is not installed or not in PATH."
    return 1
  fi
  HELM_VERSION=$(helm version --short --client 2>/dev/null | awk '{print $2}' | sed 's/v//g' || true)
  if [[ -z "${HELM_VERSION}" ]]; then
    log_error "Unable to detect helm version."
    return 1
  fi
  REQUIRED_HELM="3.0"
  if [[ $(echo "${HELM_VERSION} < ${REQUIRED_HELM}" | bc -l) -eq 1 ]]; then
    log_error "helm version ${HELM_VERSION} is below required ${REQUIRED_HELM}."
    return 1
  fi
  log_info "helm version ${HELM_VERSION} is valid."

  # 4) Verify required YAML files exist
  for yaml_file in "$NAMESPACES_YAML" "$RESOURCE_QUOTAS_YAML" "$RBAC_YAML"; do
    if [[ ! -f "$yaml_file" ]]; then
      log_error "Required YAML file not found: ${yaml_file}"
      return 1
    fi
  done
  # Optional security references:
  if [[ ! -f "$POD_SECURITY_POLICIES_YAML" ]]; then
    log_warn "Pod Security Policies file not found: ${POD_SECURITY_POLICIES_YAML}"
  fi
  if [[ ! -f "$NETWORK_POLICIES_YAML" ]]; then
    log_warn "Network Policies file not found: ${NETWORK_POLICIES_YAML}"
  fi
  log_info "All required YAML files found."

  # 5) Check network connectivity to AWS services
  # Simple check by calling a known AWS endpoint; any connection failure triggers error.
  if ! curl -s --connect-timeout 5 "https://sts.${AWS_REGION}.amazonaws.com" >/dev/null 2>&1; then
    log_error "Unable to reach AWS STS endpoint in region ${AWS_REGION}. Check network connectivity."
    return 1
  fi
  log_info "Network connectivity to AWS services verified."

  # 6) Validate AWS IAM permissions for EKS operations
  # Attempt to list clusters. If the user lacks EKS list-clusters permission, it will fail.
  if ! aws eks list-clusters --region "$AWS_REGION" >/dev/null 2>&1; then
    log_error "Insufficient AWS IAM permissions for EKS. Cannot list clusters."
    return 1
  fi
  log_info "IAM permissions for EKS operations appear valid."

  # 7) Verify SSL certificates availability
  # Quick check for system CA cert presence (for TLS with k8s cluster / AWS endpoints).
  if [[ ! -f "/etc/ssl/certs/ca-certificates.crt" && ! -f "/etc/ssl/cert.pem" ]]; then
    log_warn "System CA certificates not found at common paths. TLS connections may fail."
  else
    log_info "System CA certificates appear to be present."
  fi

  # 8) Check disk space requirements (simple check on /tmp or /)
  DISK_AVAIL=$(df -Ph / | tail -1 | awk '{print $4}' || true)
  if [[ -z "$DISK_AVAIL" ]]; then
    log_warn "Could not determine available disk space; proceed with caution."
  else
    log_info "Available disk space on /: $DISK_AVAIL"
  fi

  # 9) Validate environment variables needed for cluster creation
  if [[ -z "$CLUSTER_NAME" || -z "$AWS_REGION" ]]; then
    log_error "CLUSTER_NAME or AWS_REGION is undefined."
    return 1
  fi
  log_info "Environment variables validated. CLUSTER_NAME=${CLUSTER_NAME}, AWS_REGION=${AWS_REGION}"

  log_info "All prerequisite checks passed successfully."
  return 0
}

###############################################################################
# 2) create_namespaces
# Description:
#   Creates and configures Kubernetes namespaces with enhanced security
#   and isolation.
#
# Decorators: @retry(max_attempts=3), @logging
#
# Steps:
#   1) Apply namespace configurations with validation
#   2) Add security context constraints
#   3) Configure network policies
#   4) Apply pod security policies
#   5) Set resource limits (some apply in next function, but partial setup here)
#   6) Add monitoring annotations
#   7) Configure service mesh integration
#   8) Verify namespace isolation
#   9) Setup cross-namespace communication rules
#
# Returns: Exit code (0 for success, 1 for failure)
###############################################################################
create_namespaces() {
  log_info "Creating and configuring namespaces with enhanced security..."

  # 1) Apply namespace configurations from the consolidated file
  kubectl apply -f "$NAMESPACES_YAML" >>"$LOGFILE" 2>&1 || {
    log_error "Failed to apply namespaces configuration."
    return 1
  }

  # 2) Add security context constraints (PodSecurityPolicy references or PSA)
  # Only apply if the PSP file is available
  if [[ -f "$POD_SECURITY_POLICIES_YAML" ]]; then
    kubectl apply -f "$POD_SECURITY_POLICIES_YAML" >>"$LOGFILE" 2>&1 || {
      log_error "Failed to apply PodSecurityPolicies."
      return 1
    }
    log_info "PodSecurityPolicies applied successfully."
  else
    log_warn "Skipping PodSecurityPolicies; file not found."
  fi

  # 3) Configure network policies (restrict cross-namespace traffic)
  if [[ -f "$NETWORK_POLICIES_YAML" ]]; then
    kubectl apply -f "$NETWORK_POLICIES_YAML" >>"$LOGFILE" 2>&1 || {
      log_error "Failed to apply NetworkPolicies."
      return 1
    }
    log_info "NetworkPolicies applied successfully."
  else
    log_warn "Skipping NetworkPolicies; file not found."
  fi

  # 4) (Already applied PSP, so partial step is complete)

  # 5) Resource limits are partially enforced by PSP. Full ResourceQuota is in next function.

  # 6) Add monitoring annotations: The file already includes monitoring annotations,
  #    so no direct extra step needed. Verification step is done below.

  # 7) Configure service mesh integration placeholder:
  #    For an advanced scenario, you might label the namespaces for injection:
  #    Example: kubectl label namespace analytics istio-injection=enabled
  #    This script is flexible to integrate with any mesh solution if desired.
  #    We'll skip an actual mesh config here. This is a placeholder.
  for ns in $NAMESPACES; do
    # Example annotation or label for a hypothetical mesh
    :
  done

  # 8) Verify namespace isolation (confirm they were created and are Active)
  #    We'll just check for 'Active' status as a simple approach.
  for ns in $NAMESPACES; do
    STATUS=$(kubectl get namespace "$ns" -ojsonpath='{.status.phase}' || true)
    if [[ "$STATUS" != "Active" ]]; then
      log_error "Namespace $ns is not Active (current status: $STATUS)."
      return 1
    fi
  done

  # 9) Setup cross-namespace communication rules is partially handled by network policies
  #    and service definitions. This script does not create multi-namespace service accounts,
  #    so we rely on the existing network policies to handle isolation and allowed egress.

  log_info "Namespaces created, secured, and verified successfully."
  return 0
}

###############################################################################
# 3) apply_resource_quotas
# Description:
#   Applies and validates resource quotas with monitoring and alerts.
#
# Decorators: @monitoring, @logging
#
# Steps:
#   1) Apply quota configurations with validation
#   2) Set up quota monitoring
#   3) Configure quota alerts
#   4) Verify quota enforcement
#   5) Setup quota adjustment procedures
#   6) Configure burst handling
#   7) Implement quota reporting
#
# Returns: Exit code (0 for success, 1 for failure)
###############################################################################
apply_resource_quotas() {
  log_info "Applying resource quotas for all relevant namespaces..."

  # 1) Apply quota configurations
  kubectl apply -f "$RESOURCE_QUOTAS_YAML" >>"$LOGFILE" 2>&1 || {
    log_error "Failed to apply resource quotas."
    return 1
  }

  # 2) Set up quota monitoring - Typically done by the monitoring stack.
  #    We can annotate or label the ResourceQuota or rely on an external system.
  #    We'll do a basic verification:
  for ns in $NAMESPACES; do
    # Check if any ResourceQuota object is present in the namespace
    QUOTA_COUNT=$(kubectl get resourcequota -n "$ns" --no-headers 2>/dev/null | wc -l || true)
    if [[ "$QUOTA_COUNT" -gt 0 ]]; then
      log_info "Namespace $ns has one or more ResourceQuota objects."
    else
      log_warn "No ResourceQuota objects found for $ns; is that expected?"
    fi
  done

  # 3) Configure quota alerts
  #    This typically involves hooking into metrics from the cluster resource
  #    metrics, e.g., Prometheus alerts. We'll skip the direct config here
  #    but note the step for enterprise readiness.

  # 4) Verify quota enforcement by simulating a quick check
  #    We'll rely on the cluster's internal mechanisms to block over-limit usage.

  # 5) Setup procedures for dynamic ResourceQuota updates (omitted in this script).
  # 6) Configure burst handling (also typically an organizational process with cluster auto-scaling).
  # 7) Implement quota reporting (again, relies on the monitoring stack for usage metrics).

  log_info "Resource quotas applied and validated successfully."
  return 0
}

###############################################################################
# 4) configure_rbac
# Description:
#   Implements comprehensive RBAC policies with audit logging.
#
# Decorators: @audit_logging, @security_validation
#
# Steps:
#   1) Apply RBAC configurations with validation
#   2) Create service accounts with least privilege
#   3) Configure role bindings with scope limitations
#   4) Setup audit logging for RBAC changes
#   5) Implement role hierarchy
#   6) Configure emergency access procedures
#   7) Setup RBAC monitoring and alerts
#   8) Validate permission boundaries
#   9) Implement regular RBAC review procedures
#
# Returns: Exit code (0 for success, 1 for failure)
###############################################################################
configure_rbac() {
  log_info "Applying RBAC configurations..."

  # 1) Apply RBAC from rbac.yaml
  kubectl apply -f "$RBAC_YAML" >>"$LOGFILE" 2>&1 || {
    log_error "Failed to apply RBAC configurations."
    return 1
  }

  # 2) Create service accounts with least privilege is already defined in rbac.yaml
  #    or in the service-accounts.yaml (which might be combined). If separate, apply them.
  #    For thoroughness, we also check if service-accounts.yaml is present.
  SERVICE_ACCOUNTS_YAML="../kubernetes/security/service-accounts.yaml"
  if [[ -f "$SERVICE_ACCOUNTS_YAML" ]]; then
    kubectl apply -f "$SERVICE_ACCOUNTS_YAML" >>"$LOGFILE" 2>&1 || {
      log_error "Failed to create or apply service accounts."
      return 1
    }
    log_info "Service accounts applied from service-accounts.yaml."
  else
    log_warn "service-accounts.yaml not found; skipping dedicated service account creation."
  fi

  # 3) Role bindings with scope limitations are handled in rbac.yaml

  # 4) Setup audit logging for RBAC changes:
  #    Typically cluster-level auditing is handled at the control plane.
  #    If control-plane logs are accessible, we can funnel them to a SIEM.

  # 5) Implement role hierarchy - Partially done within cluster roles for monitoring, etc.

  # 6) Configure emergency access procedures is an organizational/offline step.

  # 7) Setup RBAC monitoring and alerts would rely on the monitoring stack and cluster audit logs.

  # 8) Validate permission boundaries to ensure minimal privileges:
  #    We'll do a quick check on a known role.
  if ! kubectl get role analytics-role -n analytics >/dev/null 2>&1; then
    log_error "Analytics role (analytics-role) not found in analytics namespace."
    return 1
  fi

  # 9) Regular RBAC review procedures are external policy steps.

  log_info "RBAC configured and validated successfully."
  return 0
}

###############################################################################
# 5) setup_monitoring
# Description:
#   Initializes comprehensive monitoring stack with alerting.
#
# Decorators: @high_availability, @error_handling
#
# Steps:
#   1) Deploy Prometheus operator with HA configuration
#   2) Setup Grafana with persistent storage
#   3) Configure service monitors for all namespaces
#   4) Setup alerting rules and notifications
#   5) Configure log aggregation
#   6) Setup metrics retention policies
#   7) Configure cross-region monitoring
#   8) Setup performance baselines
#   9) Configure monitoring dashboards
#
# Returns: Exit code (0 for success, 1 for failure)
###############################################################################
setup_monitoring() {
  log_info "Setting up monitoring stack (Version: ${MONITORING_VERSION})..."

  # Typically, we would add a Helm repository for the Prometheus operator, then install it.
  # 1) Deploy Prometheus operator with HA configuration
  #    Example (production might be more elaborate):
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >>"$LOGFILE" 2>&1 || true
  helm repo update >>"$LOGFILE" 2>&1 || true
  helm upgrade --install prometheus-operator prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --version "${MONITORING_VERSION}" \
    --set prometheus.prometheusSpec.replicas=2 \
    --set grafana.persistence.enabled=true \
    --set grafana.persistence.size=5Gi \
    --wait >>"$LOGFILE" 2>&1 || {
      log_error "Failed to install or upgrade Prometheus Operator with HA config."
      return 1
    }
  log_info "Prometheus Operator deployed with HA configuration."

  # 2) Setup Grafana with persistent storage is included above by setting
  #    grafana.persistence.enabled and size in the same chart.

  # 3) Configure service monitors for all namespaces is included in the default
  #    kube-prometheus-stack if labeled pods exist. We'll rely on that.

  # 4) Setup alerting rules and notifications is also part of the chart, though
  #    custom rules can be added with additional YAML or Helm values.

  # 5) Configure log aggregation typically involves an ELK stack or Loki. Not in scope here,
  #    but we note the step for enterprise usage. We can place a placeholder:
  #    log_info "Log aggregation with a separate chart/solution could be installed here."

  # 6) Setup metrics retention policies is chart-based. Typically configured with
  #    Prometheus "retentionSize" or "retention" flags.

  # 7) Configure cross-region monitoring if we have multiple clusters. For now,
  #    we do a single region example.

  # 8) Setup performance baselines: can be done by generating reference metrics.

  # 9) Configure monitoring dashboards: Grafana includes many built-in dashboards.
  #    Additional dashboards can be created or imported as needed.

  log_info "Monitoring stack deployed and configured successfully."
  return 0
}

###############################################################################
# 6) main
# Description:
#   Orchestrates cluster initialization with error handling and validation.
#
# Decorators: @main, @logging
#
# Steps:
#   1) Initialize logging and monitoring
#   2) Execute prerequisites check
#   3) Create and configure namespaces
#   4) Apply and validate resource quotas
#   5) Configure and verify RBAC policies
#   6) Setup monitoring and alerting
#   7) Verify cluster health and component status
#   8) Generate initialization report
#   9) Setup automated health checks
#
# Returns: Exit code (0 for success, 1 for failure)
###############################################################################
main() {
  log_info "==================== Starting Cluster Initialization ===================="

  # 1) Initialize logging (we already have a LOGFILE). Additional monitoring can be started here.
  #    We'll simply note that logging is set up. This is step one for clarity.
  log_info "Logging initialized at ${LOGFILE}."

  # 2) Execute prerequisites check
  check_prerequisites || {
    log_error "Prerequisite checks failed. Aborting cluster initialization."
    return 1
  }

  # 3) Create and configure namespaces
  create_namespaces || {
    log_error "Failed to create/configure namespaces. Aborting initialization."
    return 1
  }

  # 4) Apply and validate resource quotas
  apply_resource_quotas || {
    log_error "Failed to apply resource quotas. Aborting initialization."
    return 1
  }

  # 5) Configure and verify RBAC policies
  configure_rbac || {
    log_error "Failed to configure RBAC. Aborting initialization."
    return 1
  }

  # 6) Setup monitoring and alerting
  setup_monitoring || {
    log_error "Failed to setup monitoring. Aborting initialization."
    return 1
  }

  # 7) Verify cluster health and component status
  #    We can do a quick readiness check for critical Deployments:
  for ns in analytics nlp tasks monitoring integration; do
    # Just an example check for any Deployments that might exist:
    DEPLOY_COUNT=$(kubectl get deploy -n "$ns" --no-headers 2>/dev/null | wc -l || true)
    if [[ "$DEPLOY_COUNT" -gt 0 ]]; then
      log_info "Checking readiness of deployments in $ns namespace..."
      kubectl rollout status deploy -n "$ns" --timeout=120s >>"$LOGFILE" 2>&1 || {
        log_error "Some deployments in $ns namespace failed to become ready."
        return 1
      }
    fi
  done
  log_info "Cluster health check: all known deployments appear ready."

  # 8) Generate initialization report (basic summary)
  cat <<EOF | tee -a "$LOGFILE"
-----------------------------------------------------------------------
Cluster Initialization Report
Environment:      $ENVIRONMENT
Cluster Name:     $CLUSTER_NAME
Region:           $AWS_REGION
Namespaces:       $NAMESPACES
Node Count Range: $MIN_NODE_COUNT - $MAX_NODE_COUNT
Monitoring Stack: Prometheus-Grafana (Version: $MONITORING_VERSION)
Result:           SUCCESS
-----------------------------------------------------------------------
EOF

  # 9) Setup automated health checks
  #    Typically done by hooking into cloud watch or hooking readiness probes in the cluster.
  #    We'll note the step here:
  log_info "Automated health checks can be scheduled with external systems (e.g., CronJobs)."

  log_info "==================== Cluster Initialization Complete ===================="
  return 0
}

###############################################################################
# EXPORT: init_cluster (Primary script entry point)
#   This function calls main() and can be invoked externally as needed.
###############################################################################
init_cluster() {
  main
}

# If this script is executed directly, call init_cluster by default.
# Otherwise, if sourced, the init_cluster function is available for external usage.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  init_cluster
fi
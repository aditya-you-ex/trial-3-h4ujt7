<!-- 
  Using 'markdown'@latest for doc formatting.
  Extensive commentary embedded as HTML comments for clarity.
-->

# TaskStream AI - Primary Documentation

<!-- 
  GLOBALS (from JSON specification):
  PROJECT_NAME: TaskStream AI
  VERSION: 1.0.0
  LICENSE: Proprietary
  SECURITY_COMPLIANCE: SOC 2 Type II, GDPR, CCPA
-->

Welcome to the TaskStream AI platform! This README provides a comprehensive overview of the system architecture, setup instructions, development workflows, security best practices, and references to supporting documentation. Whether you work on the frontend, backend, or infrastructure components, you will find essential details here to guide your efforts.

<!-- 
  REQUIREMENTS_ADDRESSED:
    1) System Overview
    2) Architecture Documentation
    3) Security Framework
    4) Development Standards
-->

---

## Project Information

- Name: TaskStream AI
- Version: 1.0.0
- License: Proprietary
- Security Compliance: SOC 2 Type II, GDPR, CCPA

This platform unifies AI-powered task extraction, microservices-based architecture, enterprise security, and scalable deployments to deliver a cutting-edge project management solution.

---

## Table of Contents

1. [TaskStream AI Platform](#taskstream-ai-platform)  
2. [System Requirements](#system-requirements)  
3. [Security Framework](#security-framework)  
4. [Development Guidelines](#development-guidelines)  
5. [Deployment Procedures](#deployment-procedures)  
6. [Code Examples](#code-examples)  
7. [References to Imported Documentation](#references-to-imported-documentation)

---

## TaskStream AI Platform

### Overview
• AI-powered project management platform overview  
• NLP-based task extraction capabilities  
• Microservices architecture leveraging Node.js, Python, Go services, containers, and cloud-native tooling  
• Security and compliance framework aligning with SOC 2 Type II and privacy regulations  
• Enterprise integration capabilities (email, chat, PM tools, analytics services, etc.)

TaskStream AI automates manual overhead by converting unstructured communications (emails, chats, meeting transcripts) into actionable tasks, analytics, and seamless resource management. Leveraging container orchestration via Kubernetes, TaskStream AI can be deployed globally for multi-tenant or single-tenant use.

---

## System Requirements

Below are the core prerequisites and tools needed to build, run, and maintain TaskStream AI.

1. Node.js ≥ 18.0.0  
   - Required for Node/Express-based microservices and build scripts.  
2. Python ≥ 3.11  
   - Critical for NLP/analytics components using frameworks like FastAPI, TensorFlow, and spaCy.  
3. Go ≥ 1.21  
   - Integration services or concurrency-heavy tasks.  
4. Docker ≥ 24.0.0  
   - Containerization platform for packaging microservices.  
5. AWS CLI ≥ 2.0  
   - Managing deployments, S3, ECR, EKS, and other AWS services.  
6. Kubernetes ≥ 1.27  
   - Container orchestration engine for production-scale deployments.  
7. Security Tools and Certificates  
   - Proper usage of GPG keys, SSL certificates, and scanning tools (Snyk, Trivy) for enterprise security.

---

## Security Framework

TaskStream AI enforces security throughout the entire software development lifecycle, meeting multiple compliance requirements and best practices:

• Authentication and Authorization  
  - Uses OAuth 2.0 and JWT-based flows, referencing identity providers like Auth0 or AWS Cognito.  
  - RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control) for granular permissions.  

• Data Encryption Standards  
  - TLS 1.3 for in-transit encryption.  
  - AES-256 at rest via KMS-managed keys for databases, object storage, and backups.  

• Compliance Requirements  
  - SOC 2 Type II controls, GDPR data privacy, and CCPA for user rights.  
  - Detailed access logs, data retention policies, and auditing protocols.  

• Security Monitoring  
  - Integration with monitoring solutions (Prometheus, Grafana, Datadog) for real-time metrics and logs.  
  - Automated alerts to Slack/Teams when anomalies or threshold breaches occur.  

• Incident Response Procedures  
  - Predefined runbooks, detection, containment, eradication, and post-incident reviews.  
  - IRSA, GuardDuty, and other AWS security services for threat detection and forensics.

<!-- 
  Incorporate references to:
  - backend_readme "security_protocols"
  - frontend_readme "security_guidelines"
  - infrastructure_readme "security_configuration"
  
  These documents detail step-by-step configurations, ranging from secure HTTP headers (helmet, express-rate-limit) to AWS security group setups, VPC isolation, and operational playbooks.
-->

In alignment with the backend security_protocols, the frontend security_guidelines, and infrastructure-level security_configuration, the entire platform follows a defense-in-depth model. Pods run with restricted PSPs (or Pod Security Admission), private subnets shield sensitive services, and advanced encryption mechanisms are standard.

---

## Development Guidelines

This section summarizes the primary development details. Each microservice or UI component references best practices from dedicated documentation.

### Environment Setup

• Refer to backend setup_instructions for Docker Compose usage, local NLP engine testing, and environment variables.  
• The infrastructure setup_instructions highlight cluster prerequisites, AWS CLI configuration, and key Terraform commands.  
• For the frontend project_overview, see how to prepare Node modules, environment variables (REACT_APP_*), and optional Docker build steps.

### Code Quality Standards

• Linting with ESLint (frontend), flake8/black (backend), and static analysis tools (SonarQube, Snyk, or Dependabot).  
• Minimum 80% test coverage enforced by Jest/Pytest in CI workflows.  
• Strict TypeScript checks (tsc --noEmit) and mypy for Python.  

### Testing Requirements

• Unit tests covering logic in Node, Python, or Go services.  
• Integration tests bridging microservices or external APIs.  
• End-to-end tests planned with Cypress or advanced test harnesses.  

### Security Best Practices

• Evaluate code via security_protocols from the backend and security_guidelines from the front.  
• Run SAST/DAST scans (Snyk, Trivy) to detect vulnerabilities in containers or dependencies.  
• Observe principle of least privilege for DB credentials, environment variables, and user roles.  

### CI/CD Pipeline

• Typically uses GitHub Actions or similar for building, testing, and scanning each commit.  
• Deployment pipeline references ArgoCD or Terraform Cloud for pushing to staging or production clusters.  
• Automatic container builds to an internal registry, versioned and scanned before rollout.

---

## Deployment Procedures

TaskStream AI can run locally with Docker Compose for development or scale to production with an enterprise-grade Kubernetes (EKS) environment:

1. Multi-Environment Setup  
   - Distinct dev, staging, and production pipelines.  
   - Per-environment credentials and secrets secured in AWS SSM or HashiCorp Vault.  

2. Security Configuration  
   - Infrastructure-level security_configuration from the infrastructure readme covers advanced KMS usage, VPC isolation, and locked-down security groups.  
   - Pod Security Policies (or replacements) ensure non-root containers and restricted capabilities.  

3. Monitoring Setup  
   - Deployed monitoring tools (Prometheus, Grafana, Datadog) in the monitoring namespace for resource metrics and application logs.  
   - Alerting rules and dashboards for CPU usage, memory, error rates, or suspicious traffic.  

4. Scaling Guidelines  
   - Horizontal Pod Autoscalers in Kubernetes for tasks or NLP services.  
   - Metric-based triggers for analytics engine scaling.  
   - Load balancers distributed across multiple AZs or regions for global coverage.  

5. Disaster Recovery  
   - Daily or hourly backups of RDS Aurora clusters, snapshots replicated in cross-region setups.  
   - S3 cross-region replication for object data.  
   - Infrastructure fully defined in Terraform for quick recreation or failover.

---

## Code Examples

Below are specific security and development-oriented commands drawn from the JSON specification.

### Secure Repository Setup

```bash
git clone <repository-url>
cd taskstream-ai
gpg --import security/keys/*.gpg
pre-commit install
```

### Secure Development Setup

```bash
# Security initialization
source scripts/security-init.sh

# Frontend with security
cd src/web
npm ci --audit
npm run security-scan

# Backend with security
cd src/backend
poetry install --no-dev
poetry run python security-check.py
```

### Security Tests

```bash
# Security test suite
npm run test:security

# Compliance checks
npm run compliance:check

# Vulnerability scan
npm run security:scan
```

---

## References to Imported Documentation

TaskStream AI’s documentation is divided among several READMEs for modular clarity:

1. [Backend Documentation](./src/backend/README.md)  
   - setup_instructions → Detailed container instructions, local environment prerequisites, microservice architecture notes  
   - development_guidelines → Guidance on code style, Docker usage, local debugging  
   - security_protocols → Authentication, encryption, network policy references, and advanced scanning

2. [Frontend Documentation](./src/web/README.md)  
   - project_overview → High-level design of the React + TypeScript codebase and UI/UX patterns  
   - development_workflow → Steps for local dev server, bundling, linting, testing the SPA  
   - security_guidelines → Handling tokens, CSRF, public assets, environment variables

3. [Infrastructure Documentation](./infrastructure/README.md)  
   - setup_instructions → Terraform modules, AWS networking, EKS cluster creation, multi-region notes  
   - deployment_guide → Production deployment best practices, cluster add-ons, node pool expansions  
   - security_configuration → VPC design, IAM roles, encryption with KMS, and multi-layer perimeter security

All sections interlock to provide a robust, enterprise-grade approach. With these references, teams can confidently implement and maintain TaskStream AI across diverse environments, ensuring compliance, performance, and scalability.
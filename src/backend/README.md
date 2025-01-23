# TaskStream AI Backend Documentation

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Services](#services)
4. [Security](#security)
5. [Development](#development)
6. [Deployment](#deployment)
7. [Code Examples](#code-examples)

---

## Overview

Welcome to the documentation for the TaskStream AI Backend (Version: 1.0.0, License: Proprietary). This repository houses enterprise-grade backend services that power the AI-driven project management features of TaskStream AI. Our solution integrates Natural Language Processing (NLP), advanced analytics, task management, and a flexible integration framework. The backend is designed to efficiently index, process, and manage large volumes of project data and team communications in a secure, scalable, and maintainable manner.

### System Documentation

According to the system overview (Technical Specifications §1.2), TaskStream AI delivers:
• An NLP Engine for parsing emails, chat messages, and meeting transcripts to generate actionable tasks.  
• A robust Task Management component for creation, assignment, and tracking tasks within distributed teams.  
• An Analytics Engine for predictive analysis, resource optimization, and deep insights into project progress.  
• A Collaboration Platform (paired with the frontend) that handles real-time edits and communication.  
• An Integration Framework that connects external platforms like Jira, Asana, Slack, or email services.  

This documentation focuses on the backend architecture, setup instructions, security protocols, development environment, and deployment procedures critical to maintaining these capabilities.

---

## Prerequisites

Before running or contributing to TaskStream AI Backend, ensure you have the following tools and environments installed:

• Node.js ≥ 18.0.0 (for Node/Express-based microservices, build tools, and npm scripts)  
• Python ≥ 3.11 (for FastAPI-based NLP and analytics services)  
• Go ≥ 1.21 (for integration services requiring high concurrency and low memory overhead)  
• Docker ≥ 24.0.0 (containerization platform for packaging and running services)  
• Docker Compose ≥ 3.8 (orchestration of multi-container environments)  
• AWS CLI ≥ 2.0 (infrastructure interactions, S3, ECR, ECS/EKS)  
• kubectl ≥ 1.27 (Kubernetes deployment and management)  
• Terraform ≥ 1.5 (infrastructure-as-code for provisioning cloud resources)

These prerequisites align with the recommended frameworks and libraries described in the technical specification. Additionally, this backend uses the following from our internal configuration:

• [package.json] – references the "version" (1.0.0), "scripts" (build, test, lint, dev, etc.), and "dependencies" (including Express, FastAPI-related tools, and security libraries like “helmet” and “express-rate-limit”).  
• [docker-compose.yml] – leverages "services" (nlp_service, postgres, redis, elasticsearch, mongodb), "volumes" (postgres_data, redis_data, elasticsearch_data, mongodb_data), and "networks" (taskstream_network) for local development and testing.

---

## Services

TaskStream AI Backend comprises multiple microservices, each focused on a specific domain. The docker-compose.yml file lists the core services for local development, including:

1. **nlp_service**  
   • Written in Python (FastAPI) to perform text preprocessing, entity extraction, classification, and other ML tasks.  
   • Depends on Redis for caching and Elasticsearch for advanced text searching.  
   • Exposes a health endpoint at /health (port 5000 by default).  

2. **postgres**  
   • Postgres 14-alpine.  
   • Primary relational database for tasks, user accounts, and transactional data.  
   • Uses secrets (postgres_password) for credentials.  

3. **redis**  
   • Redis 7.0-alpine with in-memory caching for real-time data.  
   • Provides high-speed cache for session data, NLP model intermediates, and ephemeral tasks.  

4. **elasticsearch**  
   • Elasticsearch 8.0 for full-text search and data indexing.  
   • Single-node mode for local dev; production usage employs multi-node clusters.  

5. **mongodb**  
   • MongoDB 6.0 for document-based storage of semi-structured or unstructured data.  
   • In production, typically employed with replica sets or sharding.  

### High-Level Interaction
• Node-based services (Auth Service, Task Service, etc.) run independently (not shown in docker-compose.yml for brevity).  
• Go-based Integration Service connects external systems, handling concurrency using gRPC or REST, depending on your configuration.  
• All services share the same Docker network (taskstream_network) defined in the Compose file.

---

## Security

Security implementation (Technical Specifications §7) is a top priority. Key security features include:

1. **Authentication and Authorization**  
   • Central Auth Service using OAuth 2.0, JSON Web Tokens (JWT), and optional Single Sign-On (SSO) integration.  
   • Role-based access (RBAC) and attribute-based access (ABAC) as needed, guided by an authorization matrix.  

2. **Data Encryption**  
   • In Transit: TLS 1.3 for all API traffic (HTTPS).  
   • At Rest: AES-256 encryption for databases (including backups).  
   • Secrets Management: AWS Secrets Manager or Docker secrets for sensitive credentials.  

3. **Compliance and Governance**  
   • Aligns with SOC 2 Type II and GDPR guidelines.  
   • Detailed access controls, logging, and audit trails.  
   • Periodic scans with tools such as Trivy, SonarQube, and automated vulnerability scanning in CI.  

4. **Security Audits and Incident Response**  
   • Ongoing vulnerability scanning with “npm run security:audit” (from package.json scripts).  
   • Incident Response Plan covering detection, containment, and recovery.  

### Additional Security Procedures
• Strict code reviews and integration tests ensure minimized attack surfaces.  
• “express-rate-limit” integrated for DDoS mitigation.  
• Secret scanning (e.g., GitHub’s advanced security) to prevent accidental exposure of credentials.

---

## Development

Development environment details (Technical Specifications §8.1) recommend the following setup:

1. **Local Environment**  
   • IDE/Editor: VS Code or PyCharm Professional for Python-based microservices.  
   • Docker Desktop: Containerized environment for local runs.  
   • Git Flow: Feature branches, staging, and main merges with pull requests.  

2. **Code Style and Linting**  
   • Python: “flake8” for linting, “black” for formatting, and “mypy” for static type checks.  
   • TypeScript/Node: ESLint (with Airbnb or recommended config) and Prettier for consistent formatting.  

3. **Testing Requirements (≥80% Coverage)**  
   • “npm run test:coverage” uses Jest for Node services with coverage thresholds enforced.  
   • “pytest” for Python microservices.  
   • Additional integration tests to ensure correct cross-service interactions.  

4. **Package.json Scripts**  
   • **"dev"** – spins up dev servers with live reload (nodemon / ts-node).  
   • **"test"** / **"test:coverage"** – ensures 80% global coverage minimum.  
   • **"lint"** – runs ESLint on .ts files; Python lint tasks handled separately.  
   • **"security:audit"** – checks for high-severity vulnerabilities with npm audit.  
   • **"build"** – compiles TypeScript or other build tasks for production.  

5. **Code Quality Standards**  
   • Enforced 85% quality gate on SonarQube or Snyk for both Node and Python code.  
   • Pre-commit hooks with husky and lint-staged to ensure code cleanliness.

---

## Deployment

TaskStream AI Backend supports flexible deployment scenarios, from simple Docker Compose to production-grade orchestration on Kubernetes or AWS ECS. The CI/CD pipeline (GitHub Actions or equivalent) typically follows these stages:

1. **CI Pipeline**  
   • On each commit, run “npm run validate” (lint, test, coverage, type-check) or “pytest” for Python.  
   • Automated security scanning using Snyk or Trivy.  

2. **Container Build**  
   • Multi-stage Dockerfiles (Node and Python) for a minimal production footprint.  
   • Docker Compose for local dev. Production uses a registry (e.g., ECR).  

3. **Infrastructure Provisioning**  
   • Terraform (≥1.5) for AWS resources, VPC, EKS, RDS, and security groups.  
   • kubectl (≥1.27) to manage pods, services, and deployments in Kubernetes.  
   • Load balancers, autoscaling, secrets, and config maps.  

4. **Monitoring and Alerting**  
   • Observability stack (Prometheus/Grafana) or Datadog for resource metrics, logs, and tracing.  
   • Alerting to Slack, Teams, or PagerDuty if thresholds are exceeded.  

5. **Backup and Disaster Recovery**  
   • Automated snapshots of RDS (Postgres) and EBS volumes for stateful services.  
   • Cross-region failover for mission-critical workloads.

---

## Code Examples

Below are frequently used commands from various workflow stages. Adjust paths if your local folder structure differs.

### Installation
```bash
npm install
poetry install
go mod download
terraform init
```

### Development Server
```bash
docker-compose up -d
npm run dev
poetry run uvicorn main:app --reload
go run main.go
```

### Testing
```bash
npm run test
npm run test:coverage
poetry run pytest
go test ./...
```

### Deployment
```bash
terraform plan
terraform apply
docker-compose build
kubectl apply -f k8s/
```

---

**Thank you for choosing TaskStream AI Backend!** For any additional guidance or support, please consult our internal wiki or contact the DevOps team. If you discover issues, please open a ticket or pull request following our established branch and review policies.
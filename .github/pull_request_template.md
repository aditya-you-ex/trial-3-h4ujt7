<!--
  ==============================================================================
  PULL REQUEST TEMPLATE: TaskStream AI Platform
  ==============================================================================
  This template enforces the following enterprise-level requirements:
    1) Code Quality Standards (ensure ≥80% coverage, code style compliance, 
       structured review processes).
    2) Development Environment Setup (Git flow with feature branches).
    3) Security Protocols (RBAC-based review, mandatory security validation).
    4) ML Model Validation (ensure ≥95% accuracy for model-related changes).
    5) CODEOWNERS Reference:
       - Security or ML code changes require mandatory security team review 
         (security_team_rules).
       - Ownership and path-based approvals must align with code_ownership_rules.
  ==============================================================================
  Title Format: [Type] Brief Description
  Valid Types: feature | bugfix | hotfix | refactor | docs | test | ci | security | performance | ml-model
  Required Sections: 
    1) Description (≥200 chars) 
    2) Type of Change 
    3) Changes Made 
    4) Testing 
    5) ML Model Validation 
    6) Security Considerations 
    7) Performance Impact 
    8) Documentation 
    9) Review Checklist
  ==============================================================================
-->

<!-- 
  TITLE: 
  Provide your PR Title below (must match the format: [Type] Brief Description).
  Example: [feature] Implement advanced analytics pipeline
-->
# [Type] Brief Description

---

## 1) Type of Change
<!-- 
  Choose one category that aligns with your PR:
    - feature
    - bugfix
    - hotfix
    - refactor
    - docs
    - test
    - ci
    - security
    - performance
    - ml-model
-->

**Type:** 

---

## 2) Description
<!-- 
  Comprehensive PR Description (≥200 characters).
  Include each of these sub-sections:

  1) Problem Statement
  2) Solution Overview
  3) Technical Approach
  4) Related Issues/Tickets
  5) Dependencies
  6) Breaking Changes (if any)
  
  Be as thorough as possible: 
    - For Code Quality and Team Collaboration, 
      ensure clarity about your approach, 
      references to known issues or tasks, 
      and any special constraints or risk areas.
-->

**Problem Statement:**  

**Solution Overview:**  

**Technical Approach:**  

**Related Issues/Tickets:**  

**Dependencies:**  

**Breaking Changes:**  

*Add additional context beyond these fields if needed; minimum length applies.*

---

## 3) Changes Made
<!-- 
  Detail the technical changes in depth. 
  Address each sub-section:

  - Implementation Details
  - Architecture Changes
  - Database Modifications
  - API Changes
  - Configuration Updates
  - Infrastructure Changes
  
  This ensures a complete overview of how your PR modifies the system.
-->

**Implementation Details:**  

**Architecture Changes:**  

**Database Modifications:**  

**API Changes:**  

**Configuration Updates:**  

**Infrastructure Changes:**  

---

## 4) Testing
<!-- 
  Provide comprehensive testing info and results:

  - Test Coverage (must be ≥80%)
  - Unit Tests Added/Updated
  - Integration Tests
  - Performance Test Results
  - Load Test Results
  - Manual Testing Steps

  Align with the platform's "Code Quality Standards" to confirm you meet 
  the 80% coverage threshold. If coverage is below 80%, clarify why.
-->

**Test Coverage (min 80%):**  

**Unit Tests Added/Updated:**  

**Integration Tests:**  

**Performance Test Results:**  

**Load Test Results:**  

**Manual Testing Steps:**  

---

## 5) ML Model Validation
<!-- 
  Required if your PR touches any ML or AI components (or labeled as 'ml-model'). 
  Must ensure ≥95% accuracy in task identification or relevant metric. 
  Include:

  - Model Accuracy Metrics
  - Bias Assessment
  - Performance Benchmarks
  - Dataset Validation
  - Error Analysis

  If not applicable, state N/A. 
  If needed, confirm security team review (see next section) 
  if the changes also impact data access or authentication.
-->

**Model Accuracy Metrics:**  

**Bias Assessment:**  

**Performance Benchmarks:**  

**Dataset Validation:**  

**Error Analysis:**  

---

## 6) Security Considerations
<!-- 
  If your PR involves any security, authentication, authorization, 
  data-access, or ml-model changes, a mandatory security team review 
  is required (as enforced by .github/CODEOWNERS). 

  Fields to cover:
    - Security Impact Assessment
    - Vulnerability Scan Results
    - Access Control Changes
    - Data Protection Impact
    - Compliance Requirements
    - Security Team Review Status
-->

**Security Impact Assessment:**  

**Vulnerability Scan Results:**  

**Access Control Changes:**  

**Data Protection Impact:**  

**Compliance Requirements:**  

**Security Team Review Status:**  

---

## 7) Performance Impact
<!-- 
  Summarize expected performance considerations:
    - Resource Utilization Changes
    - Latency Impact
    - Scalability Assessment
    - Memory Usage
    - CPU Usage
    - Network Impact

  This section is mandatory for all PRs. 
  For major changes or 'performance' type, 
  include detailed metrics or load test data.
-->

**Resource Utilization Changes:**  

**Latency Impact:**  

**Scalability Assessment:**  

**Memory Usage:**  

**CPU Usage:**  

**Network Impact:**  

---

## 8) Documentation
<!-- 
  Explain updates to documentation so users/developers can properly use or 
  integrate your changes. This may reference README updates, wiki changes, 
  or auto-generated API docs.
-->

**Documentation Updates:**  

---

## 9) Review Checklist
<!-- 
  This final section ensures readiness for review and is part of 
  the structured review process (Git flow with feature branches).

  Please confirm:
    - Minimum 80% test coverage is met or exceeded
    - Code style compliance (lint, formatting)
    - If this PR touches security or ML code, security/team reviews are requested
    - ML model accuracy meets or exceeds 95% (if applicable)
    - If fix or enhancement merges from a feature branch flow
    - All required fields in this PR template are completed thoroughly
-->

- [ ] **Code Quality**: Meets or exceeds 80% coverage, linter passes, formatting done  
- [ ] **Git Flow**: Using feature/hotfix branch structure, merges OK  
- [ ] **Security Review**: Requested from Security Team if PR involves security, auth, data-access, or ML code  
- [ ] **ML Accuracy ≥95%**: Confirmed or N/A  
- [ ] **All Required Sections Completed**: Title, Description, Changes, Testing, ML Model Validation, Security, Performance, Docs
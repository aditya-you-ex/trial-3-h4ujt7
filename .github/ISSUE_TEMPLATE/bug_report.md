<!--
  ***************************************************************************************
  TaskStream AI - Standardized Bug Report Template
  ---------------------------------------------------------------------------------------
  This template ensures comprehensive coverage of critical details for bug reporting,
  facilitating quick resolution, maintaining 99.9% uptime (System Reliability),
  preserving 95% task identification accuracy (Task Extraction Accuracy),
  and upholding strict security patch management (Security Maintenance).
  
  Imports & References:
  - LOG_LEVELS from src/backend/shared/utils/logger.ts
    Mapping for bug severity to LOG_LEVELS:
      - [critical | high] --> LOG_LEVELS.error
      - [medium]          --> LOG_LEVELS.warn
      - [low]             --> LOG_LEVELS.info
  
  Global Standards:
  - BUG_SEVERITY_LEVELS: [critical, high, medium, low]
  - BUG_TYPES: [crash, performance, security, functional, ui, integration, security-vulnerability, data-protection, compliance]
  - REQUIRED_SECTIONS: Bug Description, Environment, Reproduction Steps, Expected Behavior,
                       Actual Behavior, Logs/Screenshots, Security Impact
  
  Validation Rules:
  - Issue Title Format: [Bug][critical|high|medium|low] <Brief Description>
  - Minimum Bug Description Length: 100 characters
  - All required sections must be completed
  - Sensitive Data Patterns to redact: email, ip_address, user_id, session_data
  ***************************************************************************************
-->

---
name: "Bug Report"
about: "Create a standardized report to expedite troubleshooting and resolution"
title: "[Bug][low] Provide a brief summary of the issue here"
labels: bug
assignees: ""
---

<!--
  SECTION 1: Title
  -----------------------------------------------------------------------------------------
  Required Format: [Bug][<SEVERITY>] <Short Description>
    - <SEVERITY> must be one of: critical, high, medium, low
    - Matches the required regex: ^\[Bug\]\[(?:critical|high|medium|low)\]\s.+$
  -----------------------------------------------------------------------------------------
-->

<!--
  SECTION 2: Bug Description
  -----------------------------------------------------------------------------------------
  REQUIRED | Minimum length: 100 characters
  Fields to cover:
    1. What happened?
    2. When did it start?
    3. Impact scope (e.g., parts of functionality affected, scale of the problem)
    4. Security implications (e.g., data exposure, vulnerabilities)
    5. Data protection concerns
  -----------------------------------------------------------------------------------------
-->
## Bug Description
<!-- Please provide a thorough explanation of the issue:
     - Minimum of 100 characters required
     - Include any relevant context or background
     - Describe security or data protection concerns if relevant
-->

<!--
  SECTION 3: Environment
  -----------------------------------------------------------------------------------------
  REQUIRED
  Fields to cover:
    1. OS/Browser version
    2. Application version
    3. User role/permissions
    4. Relevant configurations
    5. Infrastructure context (e.g., AWS EKS, region)
    6. Security settings (e.g., network policies, WAF, encryption)
  -----------------------------------------------------------------------------------------
-->
## Environment
<!-- Provide details about your environment setup:
     - Operating system, browser version (if applicable)
     - Application build or release number
     - User role (e.g., admin, project manager, developer)
     - Any special configurations or system settings
     - Security features or restrictions in place
-->

<!--
  SECTION 4: Reproduction Steps
  -----------------------------------------------------------------------------------------
  REQUIRED
  Fields to cover:
    1. Preconditions (e.g., user state, data setup)
    2. Step-by-step instructions
    3. Data requirements (mock data, test accounts)
    4. Security context (authentication, tokens)
    5. Required permissions (roles, scopes)
  -----------------------------------------------------------------------------------------
-->
## Reproduction Steps
<!-- Clearly list the steps to reproduce the bug:
     1. ...
     2. ...
     3. ...
     - Include screenshots or logs if they illustrate the exact steps
     - Mention any security tokens, sessions (redacted) used in test
-->

<!--
  SECTION 5: Expected Behavior
  -----------------------------------------------------------------------------------------
  REQUIRED
  Fields to cover:
    1. Expected outcome
    2. Reference to documentation or user stories
    3. Business rules relevant to this feature
    4. Security requirements (e.g., data not exposed)
    5. Compliance needs (GDPR, CCPA, etc. if applicable)
  -----------------------------------------------------------------------------------------
-->
## Expected Behavior
<!-- Describe what you believe should happen under the normal, correct operation:
     - Outline references to official documentation or requirements
     - Include any compliance or security standards that apply
-->

<!--
  SECTION 6: Actual Behavior
  -----------------------------------------------------------------------------------------
  REQUIRED
  Fields to cover:
    1. Observed outcome
    2. Error messages (redacted if containing sensitive data)
    3. System response
    4. Security implications (any possible vulnerability triggered)
    5. Performance impact
  -----------------------------------------------------------------------------------------
-->
## Actual Behavior
<!-- Detail the actual outcome as observed:
     - Provide relevant error messages (sanitize PII)
     - Note any unexpected security or performance ramifications
-->

<!--
  SECTION 7: Logs / Screenshots
  -----------------------------------------------------------------------------------------
  REQUIRED
  Fields to cover:
    1. Error logs (redacted of PII: email, ip_address, user_id, session_data)
    2. Screenshots (blur or black out sensitive info)
    3. Console output
    4. Network traces
    5. Security logs (if relevant)
-------------------------------------------------------------------------------------------
-->
## Logs / Screenshots
<!-- Attach or paste log snippets and screenshots showing the issue:
     - Ensure no sensitive data is exposed
     - Redact email, IP addresses, user IDs, or session data
-->

<!--
  SECTION 8: Security Impact
  -----------------------------------------------------------------------------------------
  REQUIRED
  Fields to cover:
    1. Security risk assessment (critical, high, medium, low)
    2. Data protection impact (GDPR, CCPA, or internal policies)
    3. Compliance violations (regulatory concerns)
    4. Required security patches (if this is known)
    5. Any immediate mitigation steps or workarounds
  -----------------------------------------------------------------------------------------
-->
## Security Impact
<!-- Provide a thorough security assessment:
     - Describe the severity if there's a vulnerability
     - Potential data exposure or compliance concerns
     - Suggest immediate actions or patches needed
-->

<!--
  OPTIONAL: Bug Type
  -----------------------------------------------------------------------------------------
  Additional detail to classify the bug nature:
  Possible BUG_TYPES:
    - crash
    - performance
    - security
    - functional
    - ui
    - integration
    - security-vulnerability
    - data-protection
    - compliance
  -----------------------------------------------------------------------------------------
-->
<!--
## Bug Type
Please choose from one of the following:
- crash
- performance
- security
- functional
- ui
- integration
- security-vulnerability
- data-protection
- compliance
-->

<!--
  END OF TEMPLATE
  -----------------------------------------------------------------------------------------
  Thank you for completing each required section. Your input ensures
  that our team can address this issue swiftly while maintaining
  security, compliance, and system reliability standards.
-->
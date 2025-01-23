# TaskStream AI Frontend – Developer Documentation

Welcome to the comprehensive developer documentation for the TaskStream AI web application. This document aims to provide an in-depth guide covering setup, architecture, development guidelines, testing, deployment, performance, accessibility, internationalization, and security.

---

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Getting Started](#getting-started)  
3. [Development Workflow](#development-workflow)  
4. [Architecture](#architecture)  
5. [Testing](#testing)  
6. [Deployment](#deployment)  
7. [Performance](#performance)  
8. [Accessibility](#accessibility)  
9. [Internationalization](#internationalization)  
10. [Security](#security)

---

## 1. Project Overview

TaskStream AI is an enterprise-grade, AI-powered project management platform that leverages NLP and predictive analytics to streamline and automate the project lifecycle. The frontend application is built with:
- React (v18+)
- TypeScript (v5+)
- Redux Toolkit (@reduxjs/toolkit v^1.9.5)
- Material UI (@mui/material v^5.14.0)
- D3 (d3 v^7.8.0) for data visualization

### Key Features
- Automatic task extraction from team communications
- AI-driven resource optimization and task prioritization
- Intuitive UI with real-time collaboration
- Comprehensive analytics dashboards
- Enterprise integration with existing project management tools

Referencing the [Technical Specifications](../../../../) for the entire TaskStream AI platform, the frontend specifically addresses:
1. A modern development stack (React 18+, Redux Toolkit, etc.)  
2. A robust design system with WCAG 2.1 AA compliance  
3. Code quality standards (ESLint, Prettier) and at least 80% test coverage  
4. Internationalization and translation support  
5. Secure handling of authentication tokens and user data  

---

## 2. Getting Started

This section details how to set up your local environment for development, referencing both our mandatory prerequisites and the configuration from our internal files such as [package.json](./package.json) and [tsconfig.json](./tsconfig.json).

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- A modern code editor (e.g., VS Code, PyCharm, or similar)
- Docker (optional but recommended for containerized development)

### Installation
1. **Clone the repository** (Git Flow recommended for branching).
2. **Install dependencies**:
   ```bash
   npm install
   ```
   This command uses the scripts and dependencies defined in [package.json](./package.json).  
3. **Environment Variables**: Create a file named `.env` in the project root for any required environment variables. At minimum:
   ```
   REACT_APP_API_URL=<Your API endpoint>
   REACT_APP_ENV=development
   ```
4. **Verify TypeScript Configuration**: The configuration is defined in [tsconfig.json](./tsconfig.json). Confirm that your editor respects these strict compilation checks.

### Local Development
- **Start the development server**:
  ```bash
  npm run dev
  ```
  This command uses `vite` under the hood and launches the application at http://localhost:5173 (port may vary).

### Folder Structure (High-Level)
```
src/
  ├─ assets/              # Static images, fonts, etc.
  ├─ components/          # Reusable UI components
  ├─ hooks/               # Custom React hooks
  ├─ pages/               # Page-level or route-level components
  ├─ store/               # Redux Toolkit slices, store configuration
  ├─ services/            # API utilities, integration logic
  ├─ styles/              # Global styles, MUI theme overrides
  ├─ utils/               # Utility functions, helpers
  └─ App.tsx              # Main app component
```

---

## 3. Development Workflow

The TaskStream AI web repository follows modern best practices with an emphasis on code quality, readability, and maintainability.

### Git Workflow
- **Feature Branching**: Each new feature or bug fix is developed on its own branch (e.g., `feat/ai-integration` or `fix/ui-overflow`).
- **Pull Requests**: Merge into `development` after at least one code review. 
- **Staging and Main**: `staging` for final integration tests, `main` for production releases.

### Code Standards & Quality
- **ESLint (v^8.43.0) with Airbnb rules**: Configured via `.eslintrc.*`. Run:
  ```bash
  npm run lint
  npm run lint:fix
  ```
- **Prettier (v^2.8.8)**: For consistent formatting. Run:
  ```bash
  npm run format
  ```
- **TypeScript Strict Mode**: Ensures strong typing per our [tsconfig.json](./tsconfig.json).

### Scripts from package.json
- `npm run dev`: Launches development server.
- `npm run build`: Compiles the application with Vite, employing TypeScript checks and bundling optimizations.
- `npm run preview`: Previews the production build locally.
- `npm run test`: Executes Jest-based unit and integration tests.
- `npm run test:coverage`: Provides a coverage report (aim >80%).
- `npm run lint`: Lints your code using ESLint.
- `npm run format`: Formats your code with Prettier.
- `npm run type-check`: Performs a TypeScript-only compilation check.

---

## 4. Architecture

The TaskStream AI frontend is architected to be modular and scalable, with a focus on maintainability, robust state management, and a well-defined design system.

### Modern React Stack
- **React 18+** for performance benefits and concurrency features like concurrent rendering.
- **Redux Toolkit** for predictable, centralized state management with slices and RTK Query (if needed).
- **Material UI (MUI)** for baseline components, theming, and consistent UI design aligned with the design tokens.

### Folder Organization Highlights
- **Components**: Granular, reusable presentational or hybrid (container) components.
- **Pages**: Route-level organizational boundaries, typically hooking into global state and fetching data as needed.
- **Store**: Slices for each domain (e.g., tasks, projects, user), plus potential Thunks for async logic.
- **Services**: API integration with axios or fetch wrappers, centralized error handling.
- **Styles**: MUI theme override, dedicated styling modules, global CSS resets, or custom form layouts.
- **Utils / Hooks**: Reusable functionality bridging multiple components (e.g., data transforms, custom React Hooks).

### UI Design System
The UI draws heavily on the design tokens and guidelines specified in the [Technical Specifications](../../../../). Key aspects:
- **Color Palette**:  
  - Primary: #2563EB  
  - Secondary: #64748B  
  - Success: #10B981  
  - Error: #EF4444  
  - Warning: #F59E0B  
- **Typography**:  
  - Primary font: Inter  
  - Secondary font: SF Pro  
  - Monospace: JetBrains Mono  
- **Spacing**: 4px base unit (4, 8, 16, 24, 32, etc.)
- **Breakpoints**:  
  - Mobile: ≥320px  
  - Tablet: ≥768px  
  - Desktop: ≥1024px  
  - Wide: ≥1440px  
- **Accessibility**: We ensure WCAG 2.1 AA compliance via color contrast, ARIA attributes, and navigation best practices.

---

## 5. Testing

We employ an extensive test strategy centered around Jest (v^29.5.0) and React Testing Library. All new features must include corresponding test coverage aimed at 80% or higher, as required by our code quality standards.

### Test Types
1. **Unit Tests**: Validate logic at the component or utility level.  
2. **Integration Tests**: Check how multiple parts (e.g., Store + Components) work together.  
3. **Snapshot Tests**: Compare rendered output to detect unplanned UI changes.  
4. **E2E Tests (Future)**: May be integrated with Cypress for end-to-end functionality across environments.

### Running Tests
- **Standard Test**:
  ```bash
  npm run test
  ```
- **Watch Mode**:
  ```bash
  npm run test:watch
  ```
- **Coverage**:
  ```bash
  npm run test:coverage
  ```
  A detailed coverage report is generated, targeting at least 80% across statements, branches, functions, and lines.

---

## 6. Deployment

The TaskStream AI frontend is designed for cloud-native deployment pipelines, referencing CI/CD best practices from GitHub Actions or similar platforms and supporting container-based or static hosting strategies.

### Build & Production Bundles
- **Build Command**:  
  ```bash
  npm run build
  ```
  This produces an optimized output in the `dist/` folder. The bundling process leverages Vite for minimal overhead and tree-shaking.  

### Environment Configurations
- **Production**: Typically served behind a CDN such as AWS CloudFront or similar. Environment variables are injected via `.env.production`.
- **Staging**: A near-production environment for testing, with `.env.staging` to mirror production with minimal differences.
- **Local**: Development build via `npm run dev`, referencing `.env`.

### CI/CD Flow
- **GitHub Actions**: Used for building, testing, and linting on every push.  
- **ArgoCD Integration** (Optional advanced setup): Automated Docker image building, pushing to container registry, and rolling updates to your cluster.

---

## 7. Performance

High performance is essential to ensure a smooth user experience. Key considerations:

1. **Bundle Size Management**:  
   - Tree-shaking unused code, especially with MUI and D3.  
   - Dynamic Imports using `React.lazy` for code-split routes.  
2. **Caching**:  
   - Leverage long-term caching for static assets in production (e.g., hashed file names).
   - Use bundler-level chunk splitting to optimize repeated library usage.
3. **Rendering Optimization**:  
   - Identifying and memoizing heavy computations (e.g., D3 charts) with `React.useMemo`.
   - Using the DevTools Profiler to track slow renders.
4. **Network Optimization**:  
   - Minimizing API calls and bundling them with RTK Query if needed.
   - Using pagination or lazy loading for large data sets.

---

## 8. Accessibility

TaskStream AI adheres to WCAG 2.1 AA guidelines, ensuring inclusive access for all users. We use:
- **Semantic HTML**: Proper heading hierarchy, labels, and landmarks.
- **ARIA Attributes**: Supplementing or clarifying component roles.
- **Keyboard Navigation**: Full operation via tab/arrow keys, with visible focus indicators.
- **Color Contrast**: Ensuring a minimum ratio of 4.5:1 for text elements.

### ESLint & MUI A11y Plugins
- `eslint-plugin-jsx-a11y`: Active in our devDependencies to surface accessibility issues at build time.
- MUI-based components incorporate advanced a11y features out-of-the-box (e.g., role attributes on modals).

---

## 9. Internationalization

To support global teams, we offer multi-language capabilities in the React frontend:
- **i18next** and **react-i18next**: Provide translation strings, resource bundles, and dynamic locale switching.
- **Language Files**: Typically stored in a `locales/` directory with subfolders per language code (e.g., `en`, `es`, `fr`).
- **Usage**:
  ```tsx
  import { useTranslation } from 'react-i18next';

  function ExampleComponent() {
    const { t } = useTranslation();
    return <p>{t('welcome_message')}</p>;
  }
  ```
- **Best Practices**: Keep translation keys short, group them logically, and account for placeholders or pluralization rules.

---

## 10. Security

Although much of security is handled at the backend level, the frontend enforces secure patterns to protect data and user sessions:

1. **Authentication Tokens**:
   - We typically store JWTs in secure, httpOnly cookies or short-lived memory, referencing best practice to mitigate XSS.
   - Validate token presence and expiry before rendering protected routes.

2. **Avoid Storing Sensitive Data**:
   - No sensitive user info is persisted in localStorage or sessionStorage.

3. **CSRF Protections**:
   - Rely on backend-provided CSRF tokens or same-site cookie policies.
   - Ensure state-changing operations are properly protected.

4. **Secure Headers**: Defer to server configuration for `Content-Security-Policy (CSP)`, where possible.

5. **Security Libraries**:
   - Dependencies like `jsonwebtoken` and `crypto-js` (used carefully, if needed) are updated regularly.
   - We run `npm run test` and `npm run lint` plus vulnerability checks to detect security issues early.

6. **Regular Audits**:
   - Automated scanning of dependencies (e.g., Dependabot, Snyk).
   - Frequent upgrades of frameworks or libraries as listed in [package.json](./package.json).

---

**Last updated:** version_controlled

For any further guidance or advanced topics (e.g., advanced analytics, AI-driven features, or specialized integration needs), please consult the TaskStream AI core repository or reach out to the engineering team.
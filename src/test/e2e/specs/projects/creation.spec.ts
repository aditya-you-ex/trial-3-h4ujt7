// -----------------------------------------------------------------------------
// External Imports: Including library version in comments per specification
// cypress@^12.0.0
import 'cypress';

// -----------------------------------------------------------------------------
// Internal Imports: Named imports from the specified module
import { ProjectCreateInput } from '../../../web/src/types/project.types';

// -----------------------------------------------------------------------------
// E2E Test Suite: Project Creation Workflow
// -----------------------------------------------------------------------------
// This test suite covers comprehensive checks for creating a project within
// the TaskStream AI platform. It validates UI rendering, form inputs, error
// handling, and successful submission to the backend API. The steps align with
// the technical specification's requirements for form validation, user
// interface design, and project management workflows.

describe('Project Creation', { retries: { runMode: 2, openMode: 0 } }, () => {
  // ---------------------------------------------------------------------------
  // Test Data Configuration
  // ---------------------------------------------------------------------------
  const validProject: ProjectCreateInput = {
    name: 'Test Project',
    description: 'Test project description',
    // Using string-based dates for demonstration, typically parsed to Date objects
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    teamId: 'test-team-id',
  };

  // The following timeouts are derived from the specification:
  // - api: 10000 (ms)
  // - pageLoad: 5000 (ms)
  // - animation: 1000 (ms)
  // Setting global Cypress configurations for these:
  before(() => {
    Cypress.config('defaultCommandTimeout', 10000);
    Cypress.config('pageLoadTimeout', 5000);
    // There's no direct config for animation=1000, so we'll wait manually
    // after certain operations if needed.
  });

  // ---------------------------------------------------------------------------
  // Before Each Test: Common Setup Steps
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // 1. Login with test user credentials
    //    In real implementations, you might do something like:
    //    cy.login('testuser@example.com', 'testpassword');
    //    For demonstration, we assume a custom command or mock token is used:
    cy.log('Logging in as test user...');
    // Placeholder login method:
    cy.setCookie('auth_token', 'fake-jwt-token');

    // 2. Navigate to project creation page
    cy.visit('/projects/create', { timeout: 5000 });

    // 3. Intercept POST /api/v1/projects API calls
    cy.intercept('POST', '/api/v1/projects').as('createProject');

    // 4. Intercept GET /api/v1/teams API calls
    cy.intercept('GET', '/api/v1/teams').as('getTeams');

    // 5. Set viewport to 1280x720
    cy.viewport(1280, 720);
  });

  // ---------------------------------------------------------------------------
  // Test Case 1: Should display project creation form
  // ---------------------------------------------------------------------------
  it('should display project creation form', () => {
    // Verify that the form title is correctly displayed
    cy.contains('Create New Project').should('be.visible');

    // Verify presence of all required form fields (name, description, startDate, endDate, team)
    // For demonstration, we reference hypothetical data-testid attributes
    cy.get('[data-testid="project-name-input"]').should('exist').and('be.enabled');
    cy.get('[data-testid="project-description-input"]').should('exist').and('be.enabled');
    cy.get('[data-testid="project-startDate-input"]').should('exist').and('be.enabled');
    cy.get('[data-testid="project-endDate-input"]').should('exist').and('be.enabled');
    cy.get('[data-testid="project-team-input"]').should('exist').and('be.enabled');

    // Verify that submit and cancel buttons are enabled by default
    cy.get('[data-testid="project-submit-button"]').should('exist').and('be.enabled');
    cy.get('[data-testid="project-cancel-button"]').should('exist').and('be.enabled');

    // Take screenshot for visual regression
    cy.screenshot('project-creation-form');
  });

  // ---------------------------------------------------------------------------
  // Test Case 2: Should validate required fields
  // ---------------------------------------------------------------------------
  it('should validate required fields', () => {
    // Submit an empty form directly
    cy.get('[data-testid="project-submit-button"]').click();

    // Verify error messages for all required fields
    // Using placeholder selectors for each field's error message
    cy.contains('Project name is required').should('be.visible');
    cy.contains('Description is required').should('be.visible');
    cy.contains('Start date is required').should('be.visible');
    cy.contains('End date is required').should('be.visible');
    cy.contains('Team selection is required').should('be.visible');

    // Verify that form submission is prevented
    cy.wait(1000); // Wait for potential submission calls
    // No API calls should have been made
    cy.get('@createProject.all').should('have.length', 0);

    // Verify error styling matches design system (placeholder assertion)
    cy.get('[data-testid="project-name-error"]').should('have.class', 'error-text');
    cy.get('[data-testid="project-description-error"]').should('have.class', 'error-text');
  });

  // ---------------------------------------------------------------------------
  // Test Case 3: Should validate date range
  // ---------------------------------------------------------------------------
  it('should validate date range', () => {
    // Enter end date before start date
    cy.get('[data-testid="project-startDate-input"]').type('2024-01-10');
    cy.get('[data-testid="project-endDate-input"]').type('2024-01-05');

    // Submit the form
    cy.get('[data-testid="project-submit-button"]').click();

    // Verify validation error message
    cy.contains('End date cannot be before start date').should('be.visible');

    // Enter valid date range
    cy.get('[data-testid="project-startDate-input"]').clear().type('2024-01-01');
    cy.get('[data-testid="project-endDate-input"]').clear().type('2024-12-31');

    // Submit again
    cy.get('[data-testid="project-submit-button"]').click();
    // Verify that date validation passes by checking that there's no date-range error
    cy.contains('End date cannot be before start date').should('not.exist');
  });

  // ---------------------------------------------------------------------------
  // Test Case 4: Should handle duplicate project names
  // ---------------------------------------------------------------------------
  it('should handle duplicate project names', () => {
    // Intercept the POST request to simulate a 409 conflict response
    cy.intercept('POST', '/api/v1/projects', {
      statusCode: 409,
      body: {
        status: 409,
        message: 'Duplicate project name',
        data: null,
        errors: ['Project name already exists'],
        timestamp: new Date(),
      },
    }).as('createProjectConflict');

    // Fill form with an existing project name
    cy.get('[data-testid="project-name-input"]').type('Existing Project');
    cy.get('[data-testid="project-description-input"]').type('Any description');
    cy.get('[data-testid="project-startDate-input"]').type('2024-01-01');
    cy.get('[data-testid="project-endDate-input"]').type('2024-12-31');
    cy.get('[data-testid="project-team-input"]').select('test-team-id');

    // Submit form
    cy.get('[data-testid="project-submit-button"]').click();

    // Verify duplicate name error message
    cy.wait('@createProjectConflict');
    cy.contains('Project name already exists').should('be.visible');

    // Verify form remains editable
    cy.get('[data-testid="project-name-input"]').should('be.enabled');
  });

  // ---------------------------------------------------------------------------
  // Test Case 5: Should create project with valid data
  // ---------------------------------------------------------------------------
  it('should create project with valid data', () => {
    // Fill valid project data
    cy.get('[data-testid="project-name-input"]').type(validProject.name);
    cy.get('[data-testid="project-description-input"]').type(validProject.description);

    // Maple the date types to string or use a standard date control approach:
    cy.get('[data-testid="project-startDate-input"]').type('2024-01-01');
    cy.get('[data-testid="project-endDate-input"]').type('2024-12-31');

    // Select team
    cy.get('[data-testid="project-team-input"]').select(validProject.teamId);

    // Submit form
    cy.get('[data-testid="project-submit-button"]').click();

    // Wait for the POST request and validate the payload
    cy.wait('@createProject').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        name: validProject.name,
        description: validProject.description,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        teamId: validProject.teamId,
      });
    });

    // Verify success notification
    cy.contains('Project created successfully').should('be.visible');

    // Verify navigation to project details page
    // Placeholder check for presence of project details or route
    cy.url().should('include', '/projects/');
    cy.contains(validProject.name).should('be.visible');
  });

  // ---------------------------------------------------------------------------
  // Test Case 6: Should handle API errors gracefully
  // ---------------------------------------------------------------------------
  it('should handle API errors gracefully', () => {
    // Intercept the POST request to simulate a general 500 error
    cy.intercept('POST', '/api/v1/projects', {
      statusCode: 500,
      body: {
        status: 500,
        message: 'Internal Server Error',
        data: null,
        errors: ['Something went wrong'],
        timestamp: new Date(),
      },
    }).as('createProjectError');

    // Fill form with valid data
    cy.get('[data-testid="project-name-input"]').type('Faulty Project');
    cy.get('[data-testid="project-description-input"]').type('This will fail');
    cy.get('[data-testid="project-startDate-input"]').type('2024-01-01');
    cy.get('[data-testid="project-endDate-input"]').type('2024-12-31');
    cy.get('[data-testid="project-team-input"]').select('test-team-id');

    // Submit form
    cy.get('[data-testid="project-submit-button"]').click();

    // Verify error notification
    cy.wait('@createProjectError');
    cy.contains('Something went wrong').should('be.visible');

    // Verify form remains editable
    cy.get('[data-testid="project-name-input"]').should('be.enabled');

    // Verify retry button if implemented
    cy.get('[data-testid="retry-button"]').should('exist');
  });

  // ---------------------------------------------------------------------------
  // Test Case 7: Should cancel project creation
  // ---------------------------------------------------------------------------
  it('should cancel project creation', () => {
    // Fill partial data
    cy.get('[data-testid="project-name-input"]').type('Partial Data Project');

    // Click cancel button
    cy.get('[data-testid="project-cancel-button"]').click();

    // Verify confirmation dialog appears
    cy.contains('Are you sure you want to cancel?').should('be.visible');
    // Confirm cancellation
    cy.get('[data-testid="confirm-cancel-button"]').click();

    // Verify navigation to project list
    cy.url().should('include', '/projects');

    // Verify no API calls were made for project creation
    cy.get('@createProject.all').should('have.length', 0);
  });
});

// Export statement for TypeScript compatibility (no actual exported members here)
export {};
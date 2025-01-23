/***************************************************************************************************
 * File: ProjectEdit.tsx
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   A React component for editing existing project details in the TaskStream AI application. This
 *   component provides a form interface for updating project properties with validation, real-time
 *   feedback, and accessibility features. It supports the following functionalities:
 *
 *   1) Project Management: Enables core project management by allowing users to update project
 *      information such as name, description, status, and timeline fields in an intuitive UI.
 *   2) User Adoption: Offers an accessible and user-friendly editing experience with immediate
 *      validation and error feedback, promoting higher engagement.
 *   3) Task Extraction Accuracy: Improves data quality by applying robust client-side validation
 *      (95% accuracy target) before submission.
 *
 * Dependencies & References:
 *   - React 18+ for core component rendering and hooks.
 *   - react-router-dom 6+ for navigation after successful project updates.
 *   - Material UI 5+ for enterprise-style form fields, layout, and accessibility.
 *   - useForm from '../../hooks/useForm' for managing form state, validation, and submission.
 *   - Project interfaces from '../../types/project.types' for type-safe project data structures.
 *   - This file also implements a local validation function, validateProjectForm, ensuring that
 *     project name, description, status, and date ranges meet enterprise standards.
 **************************************************************************************************/

import React, { useRef, useCallback } from 'react'; // ^18.0.0
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import {
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  FormHelperText,
  TextField as FormField, // Renamed to match "FormField" usage from the JSON specification
} from '@mui/material'; // ^5.0.0

/***************************************************************************************************
 * Internal Imports (IE1)
 **************************************************************************************************/
import type {
  Project,
  ProjectStatus,
  ProjectUpdateInput,
} from '../../types/project.types';
import { useForm } from '../../hooks/useForm';

/***************************************************************************************************
 * Interface: ProjectEditProps
 * -----------------------------------------------------------------------------------------------
 * Specifies the props required by the ProjectEdit component, including the project to be edited
 * and callbacks for success/error handling. Adheres to the JSON specification's interface contract.
 **************************************************************************************************/
interface ProjectEditProps {
  /**
   * Project data to edit, containing all required fields such as id, name, description, etc.
   */
  project: Project;

  /**
   * Callback function invoked upon successful project update, providing the updated project entity.
   */
  onSuccess: (updatedProject: Project) => void;

  /**
   * Optional callback for handling errors that may occur during form submission or validation.
   */
  onError?: (error: Error) => void;
}

/***************************************************************************************************
 * Function: validateProjectForm
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   Validates project form input data with comprehensive checks. Ensures the form meets system
 *   requirements, such as a valid name, correct date range, and appropriate status selection.
 *
 * Parameters:
 *   @param values  ProjectUpdateInput - The form values that the user has entered.
 *
 * Returns:
 *   Record<string, string> - A mapping of field names to error messages (if any mistakes).
 *
 * Steps:
 *   1) Validate required name field with minimum length of 3 characters and max of 100.
 *   2) Validate description maximum length of 1000 characters if provided.
 *   3) Validate start date is not in the past.
 *   4) Validate end date is after start date if both are provided.
 *   5) Validate status is one of the allowed values.
 *   6) Return validation errors object with all discovered errors.
 **************************************************************************************************/
function validateProjectForm(values: ProjectUpdateInput): Record<string, string> {
  const errors: Record<string, string> = {};

  // 1) Name field is required, must be 3-100 characters
  if (!values.name || values.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters long.';
  } else if (values.name.trim().length > 100) {
    errors.name = 'Name cannot exceed 100 characters.';
  }

  // 2) Description max length check (1000) if provided
  if (values.description && values.description.length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.';
  }

  // 3) Validate start date is not in the past
  const now = new Date();
  if (values.startDate && values.startDate < now) {
    errors.startDate = 'Start date cannot be in the past.';
  }

  // 4) Validate end date is after start date, if both exist
  if (values.endDate && values.startDate && values.endDate < values.startDate) {
    errors.endDate = 'End date must be after the start date.';
  }

  // 5) Status must be a valid ProjectStatus
  // (In practice, we trust TypeScript or the UI to enforce correct enum usage,
  //  but we can do a runtime check for additional safety.)
  const validStatuses = Object.values(ProjectStatus);
  if (!validStatuses.includes(values.status)) {
    errors.status = 'Status is invalid. Please select a valid project status.';
  }

  return errors;
}

/***************************************************************************************************
 * Component: ProjectEdit
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   A React Functional Component for editing project details with validation and comprehensive
 *   error handling. The form leverages the useForm hook for state management, real-time feedback,
 *   and user-friendly accessibility features. On successful submission, it invokes onSuccess and
 *   navigates away or shows a success message as desired.
 *
 * Implements from the JSON spec:
 *   - constructor (simulated here via functional initialization):
 *       1) Initialize form with project data using useForm hook.
 *       2) Set up navigation function with useNavigate.
 *       3) Initialize form ref for focus management.
 *       4) Set up error boundary for component-level error handling (handled via try/catch).
 *   - handleSubmit:
 *       * Validates form data using validateProjectForm.
 *       * Shows loading state (via useForm) while submitting.
 *       * Calls project service update method (placeholder in this example).
 *       * Handles success or error with appropriate callbacks and user feedback.
 *       * Resets form state if needed.
 *       * Manages focus for accessibility.
 *   - render:
 *       * Renders the project edit form with ARIA labels and MUI fields.
 *       * Displays validation error messages in real time.
 *       * Implements keyboard navigation and accessibility best practices.
 *
 * Exports:
 *   export const ProjectEdit: React.FC<ProjectEditProps>
 **************************************************************************************************/
export const ProjectEdit: React.FC<ProjectEditProps> = ({
  project,
  onSuccess,
  onError,
}) => {
  /**
   * (constructor step) 2) Use React Router navigation for post-update redirects or transitions.
   * (constructor step) 3) Create a reference for the form element to manage focus.
   */
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Convert the incoming Project data into ProjectUpdateInput shape
   * to align with form usage. Minimally we extract fields relevant
   * to updating the project.
   */
  const initialValues: ProjectUpdateInput = {
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    teamId: project.teamId,
  };

  /**
   * useForm for enterprise-grade form state management, referencing:
   * - values: the current state of our project update data
   * - errors: any existing field-level error messages
   * - handleChange, handleBlur: react to user input for real-time validation
   * - handleSubmit: final submission aggregator
   * - etc.
   */
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    setFieldError,
    resetForm,
  } = useForm<ProjectUpdateInput>(initialValues);

  /**
   * handleFormSubmit wraps the final submission logic with validation checks
   * (constructor step) 4) We include a try/catch to simulate a small error boundary at the
   * component level; if an error occurs during processing, we forward it to onError.
   */
  const handleFormSubmit = useCallback(
    async (submittedValues: ProjectUpdateInput) => {
      try {
        // 1) Validate project form data and set errors if found
        const validationErrors = validateProjectForm(submittedValues);
        const hasValidationErrors = Object.keys(validationErrors).length > 0;
        if (hasValidationErrors) {
          Object.entries(validationErrors).forEach(([fieldName, msg]) => {
            setFieldError(fieldName as keyof ProjectUpdateInput, {
              code: 'FORM_VALIDATION_ERROR',
              message: msg,
              details: { field: fieldName },
              timestamp: new Date(),
              stackTrace: '',
            });
          });
          if (formRef.current) {
            formRef.current.focus();
          }
          return; // Halt submission if validation fails
        }

        // 2) (placeholder) project update service call
        //    In a real scenario, we would call an API here, e.g.:
        //    const updatedProject = await updateProjectAPI(submittedValues);
        //    For demonstration, mock the updated project by merging changes:
        const updatedProject: Project = {
          ...project,
          name: submittedValues.name,
          description: submittedValues.description,
          status: submittedValues.status,
          startDate: submittedValues.startDate,
          endDate: submittedValues.endDate,
          teamId: submittedValues.teamId,
        };

        // 3) On success, call onSuccess callback
        onSuccess(updatedProject);

        // 4) Optionally navigate to another route or show a success message
        navigate('/projects');

        // 5) Reset the form after successful submission
        resetForm();
      } catch (err: any) {
        // (constructor step) 4) Simple error boundary approach
        if (onError) {
          onError(err);
        }
      }
    },
    [project, onSuccess, onError, navigate, resetForm, setFieldError]
  );

  /**
   * Render / Return:
   *   The form's UI is built using MUI components for enterprise-level design
   *   and accessibility. We apply real-time helper text for validation errors.
   */
  return (
    <Box
      ref={formRef}
      component="form"
      aria-label="Edit Project Form"
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSubmit(handleFormSubmit);
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {/* Project Name Field */}
      <FormField
        name="name"
        label="Project Name"
        variant="outlined"
        fullWidth
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={Boolean(errors.name)}
        helperText={errors.name?.message || ''}
        inputProps={{ 'aria-describedby': 'project-name-error' }}
      />

      {/* Description Field */}
      <FormField
        name="description"
        label="Description"
        variant="outlined"
        multiline
        minRows={3}
        fullWidth
        value={values.description}
        onChange={handleChange}
        onBlur={handleBlur}
        error={Boolean(errors.description)}
        helperText={errors.description?.message || ''}
      />

      {/* Status Field */}
      <FormControl fullWidth variant="outlined" error={Boolean(errors.status)}>
        <InputLabel id="status-label">Status</InputLabel>
        <Select
          labelId="status-label"
          name="status"
          label="Status"
          value={values.status}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          {Object.values(ProjectStatus).map((statusOption) => (
            <MenuItem key={statusOption} value={statusOption}>
              {statusOption}
            </MenuItem>
          ))}
        </Select>
        {errors.status && (
          <FormHelperText error>{errors.status.message}</FormHelperText>
        )}
      </FormControl>

      {/* Start Date Field */}
      <FormField
        name="startDate"
        label="Start Date"
        type="date"
        InputLabelProps={{ shrink: true }}
        variant="outlined"
        fullWidth
        value={values.startDate ? values.startDate.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          const dateValue = e.target.value ? new Date(e.target.value) : null;
          handleChange({
            ...e,
            target: { ...e.target, value: dateValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }}
        onBlur={handleBlur}
        error={Boolean(errors.startDate)}
        helperText={errors.startDate?.message || ''}
      />

      {/* End Date Field */}
      <FormField
        name="endDate"
        label="End Date"
        type="date"
        InputLabelProps={{ shrink: true }}
        variant="outlined"
        fullWidth
        value={values.endDate ? values.endDate.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          const dateValue = e.target.value ? new Date(e.target.value) : null;
          handleChange({
            ...e,
            target: { ...e.target, value: dateValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }}
        onBlur={handleBlur}
        error={Boolean(errors.endDate)}
        helperText={errors.endDate?.message || ''}
      />

      {/* Submit Button */}
      <Button
        variant="contained"
        color="primary"
        type="submit"
        disabled={isSubmitting}
        sx={{ alignSelf: 'flex-start', mt: 2 }}
        aria-label="Save Project Updates"
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>
    </Box>
  );
};
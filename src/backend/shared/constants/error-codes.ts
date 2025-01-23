/**
 * This file provides standardized error codes and messages for the TaskStream AI platform.
 * It supports consistent error handling, including validation, authentication, authorization,
 * and system-level error codes. Extensive metadata is included for reliability, monitoring,
 * logs, and localization.
 *
 * By centralizing error definitions in one place, the platform achieves:
 * - Uniform API response structures in alignment with TaskStream AI's requirements
 * - Enhanced clarity for debugging, monitoring, and error tracking
 * - 99.9% uptime support through systematic handling of critical vs. non-critical errors
 * - Localization readiness with translations
 * - Severity-based logging, notifications, and follow-up actions
 *
 * Enterprise-Ready Considerations:
 * - All error codes are mapped to HTTP statuses and severities
 * - Logging thresholds (info, warn, error) are derived from severity
 * - Automatic notifications for severe errors
 * - Extensible design for new error domains
 */

// -----------------------------------------------------------------------------
// Enumerations for Various Error Domains
// -----------------------------------------------------------------------------

/**
 * Validation Errors
 * Represents issues with user input, missing fields, or data format mismatches.
 */
export const enum VALIDATION_ERRORS {
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  DATA_TYPE_MISMATCH = 'DATA_TYPE_MISMATCH',
}

/**
 * Authentication and Authorization Errors
 * Represents issues with tokens, permissions, or unauthorized access attempts.
 */
export const enum AUTH_ERRORS {
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

/**
 * Task-Related Errors
 * Represents issues encountered during task operations (creation, update, assignment, etc.).
 */
export const enum TASK_ERRORS {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_ASSIGNMENT = 'INVALID_ASSIGNMENT',
  DUPLICATE_TASK = 'DUPLICATE_TASK',
}

/**
 * Project-Related Errors
 * Represents issues specific to project discovery, status, or access control.
 */
export const enum PROJECT_ERRORS {
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  INVALID_PROJECT_STATUS = 'INVALID_PROJECT_STATUS',
  PROJECT_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED',
}

/**
 * System Errors
 * Represents critical or infrastructural issues within the TaskStream AI platform.
 */
export const enum SYSTEM_ERRORS {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
}

// -----------------------------------------------------------------------------
// Error Metadata and Messages
// -----------------------------------------------------------------------------

/**
 * ERROR_METADATA
 * Provides mappings from error codes to:
 * 1) HTTP statuses
 * 2) Severity levels
 * 3) Logging flags
 * 4) Notification triggers
 *
 * These fields drive centralized error handling, ensuring consistency in logs,
 * alerting, and API responses.
 */
export const ERROR_METADATA = {
  /**
   * httpStatus: Assigns an appropriate HTTP status code to each error code.
   * This facilitates consistent API responses in compliance with the platform's
   * error-handling specification.
   */
  httpStatus: {
    // Validation Errors
    [VALIDATION_ERRORS.INVALID_INPUT]: 400,
    [VALIDATION_ERRORS.MISSING_REQUIRED_FIELD]: 400,
    [VALIDATION_ERRORS.INVALID_FORMAT]: 422,
    [VALIDATION_ERRORS.DATA_TYPE_MISMATCH]: 422,

    // Auth/Authorization Errors
    [AUTH_ERRORS.UNAUTHORIZED]: 401,
    [AUTH_ERRORS.INVALID_TOKEN]: 401,
    [AUTH_ERRORS.TOKEN_EXPIRED]: 401,
    [AUTH_ERRORS.INSUFFICIENT_PERMISSIONS]: 403,

    // Task Errors
    [TASK_ERRORS.TASK_NOT_FOUND]: 404,
    [TASK_ERRORS.INVALID_STATUS]: 400,
    [TASK_ERRORS.INVALID_ASSIGNMENT]: 400,
    [TASK_ERRORS.DUPLICATE_TASK]: 409,

    // Project Errors
    [PROJECT_ERRORS.PROJECT_NOT_FOUND]: 404,
    [PROJECT_ERRORS.INVALID_PROJECT_STATUS]: 400,
    [PROJECT_ERRORS.PROJECT_ACCESS_DENIED]: 403,

    // System Errors
    [SYSTEM_ERRORS.INTERNAL_ERROR]: 500,
    [SYSTEM_ERRORS.SERVICE_UNAVAILABLE]: 503,
    [SYSTEM_ERRORS.DATABASE_ERROR]: 500,
    [SYSTEM_ERRORS.INTEGRATION_ERROR]: 502,
  } as Record<string, number>,

  /**
   * severity: Denotes the criticality of each error for logging and notification.
   * The platform recognizes four levels: LOW, MEDIUM, HIGH, and CRITICAL.
   */
  severity: {
    // Validation Errors (MEDIUM or LOW)
    [VALIDATION_ERRORS.INVALID_INPUT]: 'MEDIUM',
    [VALIDATION_ERRORS.MISSING_REQUIRED_FIELD]: 'LOW',
    [VALIDATION_ERRORS.INVALID_FORMAT]: 'MEDIUM',
    [VALIDATION_ERRORS.DATA_TYPE_MISMATCH]: 'MEDIUM',

    // Auth/Authorization Errors (HIGH)
    [AUTH_ERRORS.UNAUTHORIZED]: 'HIGH',
    [AUTH_ERRORS.INVALID_TOKEN]: 'HIGH',
    [AUTH_ERRORS.TOKEN_EXPIRED]: 'HIGH',
    [AUTH_ERRORS.INSUFFICIENT_PERMISSIONS]: 'HIGH',

    // Task Errors (MEDIUM or LOW)
    [TASK_ERRORS.TASK_NOT_FOUND]: 'MEDIUM',
    [TASK_ERRORS.INVALID_STATUS]: 'LOW',
    [TASK_ERRORS.INVALID_ASSIGNMENT]: 'MEDIUM',
    [TASK_ERRORS.DUPLICATE_TASK]: 'LOW',

    // Project Errors (MEDIUM or HIGH)
    [PROJECT_ERRORS.PROJECT_NOT_FOUND]: 'MEDIUM',
    [PROJECT_ERRORS.INVALID_PROJECT_STATUS]: 'LOW',
    [PROJECT_ERRORS.PROJECT_ACCESS_DENIED]: 'HIGH',

    // System Errors (CRITICAL or HIGH)
    [SYSTEM_ERRORS.INTERNAL_ERROR]: 'CRITICAL',
    [SYSTEM_ERRORS.SERVICE_UNAVAILABLE]: 'CRITICAL',
    [SYSTEM_ERRORS.DATABASE_ERROR]: 'CRITICAL',
    [SYSTEM_ERRORS.INTEGRATION_ERROR]: 'HIGH',
  } as Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>,

  /**
   * shouldLog: Determines whether an error must be logged. Most errors are logged,
   * but some frequent, low-severity errors could be selectively excluded.
   */
  shouldLog: {
    // Validation Errors
    [VALIDATION_ERRORS.INVALID_INPUT]: true,
    [VALIDATION_ERRORS.MISSING_REQUIRED_FIELD]: true,
    [VALIDATION_ERRORS.INVALID_FORMAT]: true,
    [VALIDATION_ERRORS.DATA_TYPE_MISMATCH]: true,

    // Auth/Authorization Errors
    [AUTH_ERRORS.UNAUTHORIZED]: true,
    [AUTH_ERRORS.INVALID_TOKEN]: true,
    [AUTH_ERRORS.TOKEN_EXPIRED]: true,
    [AUTH_ERRORS.INSUFFICIENT_PERMISSIONS]: true,

    // Task Errors
    [TASK_ERRORS.TASK_NOT_FOUND]: true,
    [TASK_ERRORS.INVALID_STATUS]: true,
    [TASK_ERRORS.INVALID_ASSIGNMENT]: true,
    [TASK_ERRORS.DUPLICATE_TASK]: true,

    // Project Errors
    [PROJECT_ERRORS.PROJECT_NOT_FOUND]: true,
    [PROJECT_ERRORS.INVALID_PROJECT_STATUS]: true,
    [PROJECT_ERRORS.PROJECT_ACCESS_DENIED]: true,

    // System Errors
    [SYSTEM_ERRORS.INTERNAL_ERROR]: true,
    [SYSTEM_ERRORS.SERVICE_UNAVAILABLE]: true,
    [SYSTEM_ERRORS.DATABASE_ERROR]: true,
    [SYSTEM_ERRORS.INTEGRATION_ERROR]: true,
  } as Record<string, boolean>,

  /**
   * requiresNotification: Indicates whether an alert or notification should be sent
   * to the engineering or ops teams when the error occurs.
   */
  requiresNotification: {
    // Validation Errors
    [VALIDATION_ERRORS.INVALID_INPUT]: false,
    [VALIDATION_ERRORS.MISSING_REQUIRED_FIELD]: false,
    [VALIDATION_ERRORS.INVALID_FORMAT]: false,
    [VALIDATION_ERRORS.DATA_TYPE_MISMATCH]: false,

    // Auth/Authorization Errors
    [AUTH_ERRORS.UNAUTHORIZED]: false,
    [AUTH_ERRORS.INVALID_TOKEN]: false,
    [AUTH_ERRORS.TOKEN_EXPIRED]: false,
    [AUTH_ERRORS.INSUFFICIENT_PERMISSIONS]: false,

    // Task Errors
    [TASK_ERRORS.TASK_NOT_FOUND]: false,
    [TASK_ERRORS.INVALID_STATUS]: false,
    [TASK_ERRORS.INVALID_ASSIGNMENT]: false,
    [TASK_ERRORS.DUPLICATE_TASK]: false,

    // Project Errors
    [PROJECT_ERRORS.PROJECT_NOT_FOUND]: false,
    [PROJECT_ERRORS.INVALID_PROJECT_STATUS]: false,
    [PROJECT_ERRORS.PROJECT_ACCESS_DENIED]: false,

    // System Errors (example: system-level issues often require notifications)
    [SYSTEM_ERRORS.INTERNAL_ERROR]: true,
    [SYSTEM_ERRORS.SERVICE_UNAVAILABLE]: true,
    [SYSTEM_ERRORS.DATABASE_ERROR]: true,
    [SYSTEM_ERRORS.INTEGRATION_ERROR]: true,
  } as Record<string, boolean>,
};

/**
 * ERROR_MESSAGES
 * Provides human-readable messages and optional translations for each error code.
 * The `metadata` property references the complete ERROR_METADATA object to ensure
 * consistent alignment with system-level definitions.
 */
const ERROR_MESSAGES: Record<
  string,
  {
    message: string;
    translations?: Record<string, string>;
    metadata: typeof ERROR_METADATA;
  }
> = {
  // ---------------------------------------------------------------------------
  // Validation Errors
  // ---------------------------------------------------------------------------
  [VALIDATION_ERRORS.INVALID_INPUT]: {
    message: 'The input provided is invalid.',
    translations: {
      es: 'La entrada proporcionada no es válida.',
    },
    metadata: ERROR_METADATA,
  },
  [VALIDATION_ERRORS.MISSING_REQUIRED_FIELD]: {
    message: 'A required field is missing.',
    translations: {
      es: 'Falta un campo requerido.',
    },
    metadata: ERROR_METADATA,
  },
  [VALIDATION_ERRORS.INVALID_FORMAT]: {
    message: 'The data format is incorrect.',
    translations: {
      es: 'El formato de los datos es incorrecto.',
    },
    metadata: ERROR_METADATA,
  },
  [VALIDATION_ERRORS.DATA_TYPE_MISMATCH]: {
    message: 'One or more fields have the wrong data type.',
    translations: {
      es: 'Uno o más campos tienen un tipo de dato incorrecto.',
    },
    metadata: ERROR_METADATA,
  },

  // ---------------------------------------------------------------------------
  // Authentication/Authorization Errors
  // ---------------------------------------------------------------------------
  [AUTH_ERRORS.UNAUTHORIZED]: {
    message: 'User is not authorized to perform this action.',
    translations: {
      es: 'El usuario no está autorizado para realizar esta acción.',
    },
    metadata: ERROR_METADATA,
  },
  [AUTH_ERRORS.INVALID_TOKEN]: {
    message: 'Invalid authentication token.',
    translations: {
      es: 'Token de autenticación no válido.',
    },
    metadata: ERROR_METADATA,
  },
  [AUTH_ERRORS.TOKEN_EXPIRED]: {
    message: 'Authentication token has expired.',
    translations: {
      es: 'El token de autenticación ha expirado.',
    },
    metadata: ERROR_METADATA,
  },
  [AUTH_ERRORS.INSUFFICIENT_PERMISSIONS]: {
    message: 'Insufficient permissions to access this resource.',
    translations: {
      es: 'Permisos insuficientes para acceder a este recurso.',
    },
    metadata: ERROR_METADATA,
  },

  // ---------------------------------------------------------------------------
  // Task Errors
  // ---------------------------------------------------------------------------
  [TASK_ERRORS.TASK_NOT_FOUND]: {
    message: 'The requested task could not be found.',
    translations: {
      es: 'No se pudo encontrar la tarea solicitada.',
    },
    metadata: ERROR_METADATA,
  },
  [TASK_ERRORS.INVALID_STATUS]: {
    message: 'The status provided for the task is invalid.',
    translations: {
      es: 'El estado proporcionado para la tarea es inválido.',
    },
    metadata: ERROR_METADATA,
  },
  [TASK_ERRORS.INVALID_ASSIGNMENT]: {
    message: 'Invalid assignment detected. Please verify assignee.',
    translations: {
      es: 'Asignación inválida. Verifique el destinatario de la tarea.',
    },
    metadata: ERROR_METADATA,
  },
  [TASK_ERRORS.DUPLICATE_TASK]: {
    message: 'A task with identical parameters already exists.',
    translations: {
      es: 'Ya existe una tarea con parámetros idénticos.',
    },
    metadata: ERROR_METADATA,
  },

  // ---------------------------------------------------------------------------
  // Project Errors
  // ---------------------------------------------------------------------------
  [PROJECT_ERRORS.PROJECT_NOT_FOUND]: {
    message: 'The specified project could not be located.',
    translations: {
      es: 'No se pudo ubicar el proyecto especificado.',
    },
    metadata: ERROR_METADATA,
  },
  [PROJECT_ERRORS.INVALID_PROJECT_STATUS]: {
    message: 'The provided project status is invalid or unsupported.',
    translations: {
      es: 'El estado de proyecto proporcionado no es válido o no está soportado.',
    },
    metadata: ERROR_METADATA,
  },
  [PROJECT_ERRORS.PROJECT_ACCESS_DENIED]: {
    message: 'Access to the project is denied due to insufficient rights.',
    translations: {
      es: 'Se negó el acceso al proyecto por privilegios insuficientes.',
    },
    metadata: ERROR_METADATA,
  },

  // ---------------------------------------------------------------------------
  // System Errors
  // ---------------------------------------------------------------------------
  [SYSTEM_ERRORS.INTERNAL_ERROR]: {
    message: 'An internal server error occurred.',
    translations: {
      es: 'Ocurrió un error interno del servidor.',
    },
    metadata: ERROR_METADATA,
  },
  [SYSTEM_ERRORS.SERVICE_UNAVAILABLE]: {
    message: 'The service is currently unavailable. Please try again later.',
    translations: {
      es: 'El servicio no está disponible en este momento. Por favor, inténtelo más tarde.',
    },
    metadata: ERROR_METADATA,
  },
  [SYSTEM_ERRORS.DATABASE_ERROR]: {
    message: 'A database error has occurred. Operation could not be completed.',
    translations: {
      es: 'Se produjo un error de base de datos. La operación no pudo completarse.',
    },
    metadata: ERROR_METADATA,
  },
  [SYSTEM_ERRORS.INTEGRATION_ERROR]: {
    message: 'An integration failure occurred while communicating with an external service.',
    translations: {
      es: 'Se produjo una falla de integración al comunicarse con un servicio externo.',
    },
    metadata: ERROR_METADATA,
  },
};

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------

/**
 * Describes the structure of the error response returned by getErrorMessage.
 */
interface ErrorResponse {
  message: string;
  metadata: {
    httpStatus: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    shouldLog: boolean;
    requiresNotification: boolean;
  };
  context: Record<string, any>;
}

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

/**
 * getErrorMessage
 * Retrieves a standardized error message with localized text and associated
 * metadata for a given error code. This function aligns with the platform's
 * API response standards and reliability criteria.
 *
 * Steps:
 * 1. Validate that the error code is recognized
 * 2. Check if the requested locale translation is available; if not, use default
 * 3. Retrieve error message and relevant base metadata
 * 4. Optionally apply context variables (not implemented here, but can be extended)
 * 5. Return a complete ErrorResponse object
 *
 * @param errorCode - The standardized error code
 * @param locale - Preferred language code (e.g., 'en', 'es')
 * @param context - Additional context or details pertaining to the error
 * @returns An ErrorResponse object containing message, metadata, and context
 */
export function getErrorMessage(
  errorCode: string,
  locale: string,
  context: Record<string, any>
): ErrorResponse {
  // (1) Validate error code
  if (!ERROR_MESSAGES[errorCode]) {
    // If it doesn't exist in our registry, return a default unknown error response
    return {
      message: `An unknown error occurred: ${errorCode}`,
      metadata: {
        httpStatus: 500,
        severity: 'CRITICAL',
        shouldLog: true,
        requiresNotification: true,
      },
      context,
    };
  }

  // (2) Check localization availability
  const { message, translations } = ERROR_MESSAGES[errorCode];
  let localizedMessage = message;
  if (translations && translations[locale]) {
    localizedMessage = translations[locale];
  }

  // (3) Retrieve base metadata from the global ERROR_METADATA
  const codeMetadata = {
    httpStatus: ERROR_METADATA.httpStatus[errorCode],
    severity: ERROR_METADATA.severity[errorCode],
    shouldLog: ERROR_METADATA.shouldLog[errorCode],
    requiresNotification: ERROR_METADATA.requiresNotification[errorCode],
  };

  // (4) [Placeholder for applying context variables to message template, if needed]

  // (5) Return the structured error response
  return {
    message: localizedMessage,
    metadata: codeMetadata,
    context,
  };
}

/**
 * logError
 * Logs error details to the platform's monitoring system based on severity and
 * associated metadata. This function helps ensure that critical errors are
 * immediately highlighted, while lower severity issues remain traceable in logs.
 *
 * Steps:
 * 1. Check the error's metadata to determine logging requirements
 * 2. Format the error details including contextual information
 * 3. Choose logging level (info, warn, error) based on severity
 * 4. Send logs to the appropriate logging service
 * 5. Trigger notifications if required
 *
 * @param errorCode - The standardized error code
 * @param context - Additional context or details relevant to the error
 * @returns void
 */
export function logError(errorCode: string, context: Record<string, any>): void {
  // (1) Determine whether this error should be logged
  const codeShouldLog = ERROR_METADATA.shouldLog[errorCode];
  if (!codeShouldLog) {
    return;
  }

  // (2) Prepare error details for any logging solution
  const codeSeverity = ERROR_METADATA.severity[errorCode];
  const codeRequiresNotification = ERROR_METADATA.requiresNotification[errorCode];
  const errorDetails = {
    errorCode,
    severity: codeSeverity,
    context,
  };

  // (3) Select the logging level based on severity
  switch (codeSeverity) {
    case 'LOW':
    case 'MEDIUM':
      console.info('[Error Log]', errorDetails);
      break;
    case 'HIGH':
      console.warn('[Error Log]', errorDetails);
      break;
    case 'CRITICAL':
      console.error('[Error Log]', errorDetails);
      break;
    default:
      console.log('[Error Log - Unspecified Severity]', errorDetails);
      break;
  }

  // (4) [Placeholder: Integrate with a dedicated logging or monitoring service as needed]

  // (5) Send notifications if the error requires them
  if (codeRequiresNotification) {
    // Example placeholder for alert or pager notification
    console.log('[Error Notification Triggered]', {
      notificationType: 'CriticalAlert',
      ...errorDetails,
    });
  }
}

// -----------------------------------------------------------------------------
// Optional: Exporting ERROR_MESSAGES for internal usage if needed
// -----------------------------------------------------------------------------
export { ERROR_MESSAGES };
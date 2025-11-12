import { useAuth } from '../contexts/AuthContext';

// Type for error responses
interface ErrorResponse {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  request?: any;
  message?: string;
}

/**
 * Handle API errors consistently across the application
 * @param error The error object from an API call
 * @param customHandlers Optional custom handlers for specific error codes
 * @returns Formatted error message
 */
export const handleApiError = (
  error: ErrorResponse,
  customHandlers?: Record<number, (error: ErrorResponse) => string>
): string => {
  let errorMessage = 'An unexpected error occurred. Please try again.';

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    // Check for custom handlers first
    if (customHandlers && customHandlers[status]) {
      return customHandlers[status](error);
    }
    
    // Default error handling based on status code
    switch (status) {
      case 400:
        errorMessage = data?.message || 'Invalid request. Please check the data and try again.';
        break;
      case 401:
        errorMessage = data?.message || 'Unauthorized. Please log in again.';
        break;
      case 403:
        errorMessage = data?.message || 'Access forbidden. You do not have permission to perform this action.';
        break;
      case 404:
        errorMessage = data?.message || 'Resource not found.';
        break;
      case 409:
        errorMessage = data?.message || 'Conflict occurred. The request could not be processed due to a conflict.';
        break;
      case 500:
        errorMessage = data?.message || 'Internal server error. Please try again later.';
        break;
      default:
        errorMessage = data?.message || `Server error (${status}). Please try again.`;
    }
  } else if (error.request) {
    // Network error (no response received)
    errorMessage = 'Network error. Please check your connection and try again.';
  } else if (error.message) {
    // Something else happened
    errorMessage = error.message;
  }

  return errorMessage;
};

/**
 * Check if an error is a 401 Unauthorized error
 * @param error The error object
 * @returns True if the error is a 401 Unauthorized error
 */
export const isUnauthorizedError = (error: ErrorResponse): boolean => {
  return error.response?.status === 401;
};
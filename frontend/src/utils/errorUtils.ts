/**
 * Utility functions for handling API errors safely
 *
 * The API may return errors as either strings or objects with {code, message, timestamp}.
 * These utilities ensure error messages are always strings to prevent React rendering errors.
 */

/**
 * Extracts a safe string message from an axios error response
 * Handles both string errors and object errors with a message property
 */
export function getErrorMessage(error: any, fallback: string = 'An error occurred'): string {
  // Try to get the error from axios response
  const responseError = error?.response?.data?.error;

  if (typeof responseError === 'string') {
    return responseError;
  }

  if (responseError && typeof responseError === 'object') {
    // Handle {code, message, timestamp} format
    if (typeof responseError.message === 'string') {
      return responseError.message;
    }
  }

  // Fall back to standard error message
  if (typeof error?.message === 'string') {
    return error.message;
  }

  // Check for response data message directly
  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }

  return fallback;
}

/**
 * Safely extracts error message for display
 * Use this in catch blocks when setting error state
 *
 * @example
 * try {
 *   await apiCall();
 * } catch (err) {
 *   setError(getErrorMessage(err, 'Failed to load data'));
 * }
 */
export default getErrorMessage;

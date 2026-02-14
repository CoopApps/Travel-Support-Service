/**
 * CSRF Token Service
 *
 * Manages CSRF tokens for secure cookie-based authentication.
 * CSRF tokens are required for all state-changing requests (POST, PUT, DELETE)
 * when using httpOnly cookie authentication.
 */

import apiClient from './api';

let csrfToken: string | null = null;

/**
 * Fetch a new CSRF token from the server
 */
export async function fetchCSRFToken(tenantId: number): Promise<string> {
  try {
    console.log(`Fetching CSRF token for tenant ${tenantId}...`);
    const response = await apiClient.get(`/tenants/${tenantId}/csrf-token`);
    console.log('CSRF token response:', response.data);
    csrfToken = response.data.data.csrfToken;
    console.log('CSRF token set successfully');
    return csrfToken;
  } catch (error: any) {
    console.error('Failed to fetch CSRF token:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

/**
 * Get the current CSRF token
 */
export function getCSRFToken(): string | null {
  return csrfToken;
}

/**
 * Clear the CSRF token (on logout)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
}

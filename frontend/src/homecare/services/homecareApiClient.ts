import axios, { AxiosInstance } from 'axios';

/**
 * Shared Homecare API Client
 *
 * This is the base axios instance used by all homecare API modules.
 * Follows the same pattern as the main services (api.ts)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance for homecare API calls
const homecareApiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/homecare`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
homecareApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
homecareApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default homecareApiClient;

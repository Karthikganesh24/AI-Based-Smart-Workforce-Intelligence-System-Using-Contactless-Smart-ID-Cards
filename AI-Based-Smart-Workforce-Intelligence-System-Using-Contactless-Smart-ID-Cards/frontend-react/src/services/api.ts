import axios, { AxiosError } from 'axios';
import type { ApiError } from '@models/api';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add CSRF token if available
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }

    // Create a proper Error object with the message
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    const apiError = new Error(errorMessage);

    // Attach additional properties
    (apiError as any).code = error.response?.data?.code;
    (apiError as any).status = error.response?.status;

    return Promise.reject(apiError);
  }
);

export default api;

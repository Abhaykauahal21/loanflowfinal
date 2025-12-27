import axios from 'axios';
import { store } from '../store';
import { showNotification } from '../store/slices/notificationsSlice';
import { ErrorTypes, getErrorType, getErrorMessage } from '../utils/errorHandling';

// Use environment variable for production, relative path for development
// For production on Render, set VITE_API_URL=https://loanflowfinal.onrender.com/api
let baseURL = import.meta.env.VITE_API_URL || '/api';

// Ensure baseURL ends with /api if it's a full URL
if (baseURL.startsWith('http') && !baseURL.endsWith('/api') && !baseURL.endsWith('/api/')) {
  baseURL = baseURL.endsWith('/') ? `${baseURL}api` : `${baseURL}/api`;
}

// Log API base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', baseURL);
}

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorType = getErrorType(error);
    const errorMessage = getErrorMessage(error);
    const status = error?.response?.status;
    const isAuthEndpoint = error?.config?.url?.includes('/auth/');

    // Only remove token and redirect on actual authentication errors
    // Don't remove on network errors or when verifying token on init
    if (errorType === ErrorTypes.AUTHENTICATION_ERROR && status === 401) {
      // Only remove token if it's not the initial token verification
      // The AuthContext will handle token removal during init
      if (!isAuthEndpoint || !error?.config?.url?.includes('/auth/user')) {
        localStorage.removeItem('token');
        // Only redirect if we're not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    if (errorType === ErrorTypes.AUTHORIZATION_ERROR) {
      store.dispatch(
        showNotification({
          type: 'error',
          message: errorMessage,
        })
      );
      return Promise.reject(error);
    }

    if (errorType === ErrorTypes.NOT_FOUND_ERROR) {
      store.dispatch(
        showNotification({
          type: 'error',
          message: errorMessage,
        })
      );
      return Promise.reject(error);
    }

    if (errorType !== ErrorTypes.UNKNOWN_ERROR) {
      store.dispatch(
        showNotification({
          type: 'error',
          message: errorMessage,
        })
      );
    }

    return Promise.reject(error);
  }
);

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  config.__retryCount = config.__retryCount || 0;
  const maxRetries = config.__maxRetries || 2;

  const status = error.response?.status;
  const isRetryable = !status || (status >= 500 && status < 600);

  if (!isRetryable || config.__retryCount >= maxRetries) {
    return Promise.reject(error);
  }

  config.__retryCount += 1;
  const delay = Math.pow(2, config.__retryCount) * 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  return api(config);
});

export default api;


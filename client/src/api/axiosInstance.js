import axios from 'axios';
import { store } from '../store';
import { showNotification } from '../store/slices/notificationsSlice';
import { ErrorTypes, getErrorType, getErrorMessage } from '../utils/errorHandling';

const api = axios.create({
  baseURL: '/api',
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

    if (errorType === ErrorTypes.AUTHENTICATION_ERROR) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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


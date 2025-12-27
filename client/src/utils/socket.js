import { io } from 'socket.io-client';

/**
 * Get the Socket.IO server URL
 * Uses the same base URL as the API but without the /api path
 */
export function getSocketURL() {
  // Use environment variable for production, relative path for development
  let apiURL = import.meta.env.VITE_API_URL || '/api';
  
  // If it's a relative path (development), use the same origin
  if (!apiURL.startsWith('http')) {
    return undefined; // Socket.IO will use current origin
  }
  
  // Remove /api from the end if present
  if (apiURL.endsWith('/api') || apiURL.endsWith('/api/')) {
    return apiURL.replace(/\/api\/?$/, '');
  }
  
  return apiURL;
}

/**
 * Create a Socket.IO client instance with proper configuration
 * @param {Object} options - Additional Socket.IO options
 * @returns {Socket} Socket.IO client instance
 */
export function createSocket(options = {}) {
  const socketURL = getSocketURL();
  const token = localStorage.getItem('token');
  
  return io(socketURL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    ...options,
  });
}


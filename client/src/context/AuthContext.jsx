import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import axios from '../api/axios';
import { hasPermission, getRolePermissions, Permissions } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState([]);

  const clearError = () => setError(null);

  // Update permissions when user changes
  useEffect(() => {
    if (user && user.role) {
      const rolePermissions = getRolePermissions(user.role);
      setPermissions(rolePermissions);
    } else {
      setPermissions([]);
    }
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token and get user - skip health check to avoid unnecessary requests
        const response = await axios.get('/auth/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data) {
          setUser(response.data);
          setError(null);
        } else {
          throw new Error('Invalid user data');
        }
      } catch (err) {
        // Only remove token on actual authentication errors (401, 403)
        // Don't remove on network errors or server errors (500)
        const status = err?.response?.status;
        const isAuthError = status === 401 || status === 403;
        
        if (isAuthError) {
          console.error('Token verification failed - authentication error:', err);
          localStorage.removeItem('token');
          setError('Session expired. Please login again.');
          setUser(null);
        } else if (status >= 500) {
          // Server error - keep token, user might still be valid
          console.warn('Server error during token verification, keeping session:', err);
          setError('Server error. Please try again.');
          // Don't remove token or user on server errors
        } else if (!err.response) {
          // Network error - keep token, might be temporary
          console.warn('Network error during token verification, keeping session:', err);
          setError(null);
          // Don't remove token on network errors
        } else {
          // Other errors - remove token to be safe
          console.error('Token verification failed:', err);
          localStorage.removeItem('token');
          setError('Session expired. Please login again.');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const validateInput = (data, isRegister = false) => {
    if (isRegister && !data.name) {
      throw new Error('Name is required');
    }
    if (!data.email) {
      throw new Error('Email is required');
    }
    if (!data.password) {
      throw new Error('Password is required');
    }
    if (!data.email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  };

  const login = async (email, password) => {
    try {
      clearError();
      validateInput({ email, password });

      // Add retry logic for network issues
      const maxRetries = 2;
      let lastError;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.post('/auth/login', { 
            email: email.trim(), 
            password 
          });
          
          const { token, user } = response.data;
          
          if (!token || !user) {
            throw new Error('Invalid server response - missing token or user data');
          }
          
          localStorage.setItem('token', token);
          // Normalize user object to ensure _id is available across the app
          setUser({ ...user, _id: user._id || user.id });
          return user;
        } catch (err) {
          lastError = err;
          
          // Only retry on network errors or 5xx
          const status = err?.response?.status;
          const isRetryable = !status || (status >= 500 && status < 600);
          
          if (!isRetryable || attempt === maxRetries) {
            throw err;
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      
      throw lastError;
    } catch (err) {
      console.error('Login error:', err);
      
      const errorResponse = err.response?.data;
      let errorMessage;
      
      if (errorResponse?.fields) {
        // Handle field-specific validation errors
        errorMessage = Object.values(errorResponse.fields)
          .filter(msg => msg)
          .join(', ');
      } else {
        errorMessage = errorResponse?.msg || err.message || 'Login failed. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (name, email, password, role = 'user') => {
    try {
      clearError();
      validateInput({ name, email, password }, true);

      const response = await axios.post('/auth/register', {
        name,
        email,
        password,
        role
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      // Normalize user object to ensure _id is available across the app
      setUser({ ...user, _id: user._id || user.id });
      return user;
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.msg || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Update user profile
  const updateProfile = async (data) => {
    try {
      clearError();
      const response = await axios.put('/auth/profile', data);
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.msg || err.message || 'Profile update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Check if user has a specific permission
  const checkPermission = useMemo(() => (permission) => {
    if (!user || !user.role) return false;
    return hasPermission(user.role, permission);
  }, [user]);

  // Check if user has any of the provided permissions
  const hasAnyPermission = useMemo(() => (requiredPermissions) => {
    if (!user || !user.role) return false;
    return requiredPermissions.some(permission => hasPermission(user.role, permission));
  }, [user]);

  // Check if user has all of the provided permissions
  const hasAllPermissions = useMemo(() => (requiredPermissions) => {
    if (!user || !user.role) return false;
    return requiredPermissions.every(permission => hasPermission(user.role, permission));
  }, [user]);

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    error,
    clearError,
    updateProfile,
    permissions,
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isUser: user?.role === 'user',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export permissions for easy access
export { Permissions };

export default AuthContext;

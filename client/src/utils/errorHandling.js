// Error types
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Error messages
export const ErrorMessages = {
  [ErrorTypes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorTypes.AUTHENTICATION_ERROR]: 'Your session has expired. Please log in again.',
  [ErrorTypes.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
  [ErrorTypes.NOT_FOUND_ERROR]: 'The requested resource was not found.',
  [ErrorTypes.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ErrorTypes.SERVER_ERROR]: 'Server error. Please try again later.',
  [ErrorTypes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

// Error handling utility functions
export const getErrorType = (error) => {
  if (!error) return ErrorTypes.UNKNOWN_ERROR;

  // Axios error handling
  if (error.isAxiosError) {
    if (!error.response) return ErrorTypes.NETWORK_ERROR;

    switch (error.response.status) {
      case 400:
        return ErrorTypes.VALIDATION_ERROR;
      case 401:
        return ErrorTypes.AUTHENTICATION_ERROR;
      case 403:
        return ErrorTypes.AUTHORIZATION_ERROR;
      case 404:
        return ErrorTypes.NOT_FOUND_ERROR;
      case 500:
        return ErrorTypes.SERVER_ERROR;
      default:
        return ErrorTypes.UNKNOWN_ERROR;
    }
  }

  // Handle other error types
  if (error.name === 'ValidationError') return ErrorTypes.VALIDATION_ERROR;
  if (error.message === 'Network Error') return ErrorTypes.NETWORK_ERROR;

  return ErrorTypes.UNKNOWN_ERROR;
};

export const getErrorMessage = (error) => {
  const errorType = getErrorType(error);
  const defaultMessage = ErrorMessages[errorType];

  // Get the most specific error message available
  return (
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.response?.data?.error ||
    error?.message ||
    defaultMessage
  );
};

export const handleAxiosError = (error, dispatch, showNotification) => {
  const errorMessage = getErrorMessage(error);
  const errorType = getErrorType(error);

  // Show notification
  
  dispatch(showNotification({
    type: 'error',
    message: errorMessage,
  }));

  // Handle specific error types
  switch (errorType) {
    case ErrorTypes.AUTHENTICATION_ERROR:
      // Redirect to login or refresh token
      window.location.href = '/login';
      break;
    case ErrorTypes.AUTHORIZATION_ERROR:
      // Show access denied or redirect
      window.history.back();
      break;
    default:
      // Log error for debugging
      console.error('API Error:', {
        type: errorType,
        message: errorMessage,
        details: error,
      });
  }

  // Return error for handling in components
  return {
    type: errorType,
    message: errorMessage,
  };
};

export const validateLoanData = (data) => {
  const errors = {};

  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }

  if (!data.purpose || data.purpose.trim() === '') {
    errors.purpose = 'Loan purpose is required';
  }

  if (!data.duration || data.duration <= 0) {
    errors.duration = 'Duration must be greater than 0';
  }

  if (Object.keys(errors).length > 0) {
    throw {
      name: 'ValidationError',
      message: 'Please check your input and try again',
      errors,
    };
  }

  return true;
};

export const validateUserData = (data) => {
  const errors = {};

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Name is required';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw {
      name: 'ValidationError',
      message: 'Please check your input and try again',
      errors,
    };
  }

  return true;
};

export const validateKycData = (data) => {
  const errors = {};
  const requiredDocuments = ['idProof', 'addressProof', 'incomeProof'];

  requiredDocuments.forEach((doc) => {
    if (!data[doc]) {
      errors[doc] = `${doc.replace(/([A-Z])/g, ' $1').trim()} is required`;
    }
  });

  if (Object.keys(errors).length > 0) {
    throw {
      name: 'ValidationError',
      message: 'Please upload all required documents',
      errors,
    };
  }

  return true;
};

export const validatePaymentData = (data) => {
  const errors = {};

  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }

  if (!data.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
  }

  if (!data.loanId) {
    errors.loanId = 'Loan ID is required';
  }

  if (Object.keys(errors).length > 0) {
    throw {
      name: 'ValidationError',
      message: 'Please check your payment details and try again',
      errors,
    };
  }

  return true;
};
export class AppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const ErrorCodes = {
  AUTH_ERROR: 'AUTH_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AI_ERROR: 'AI_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export const getErrorMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return 'Network error. Please check your internet connection.';
  }

  if (error?.message?.includes('fetch')) {
    return 'Failed to connect to the server. Please try again.';
  }

  if (error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
};

export const handleApiError = (error) => {
  console.error('API Error:', error);

  if (error?.response) {
    // Server responded with error status
    const status = error.response.status;
    
    if (status === 401) {
      throw new AppError('You need to log in to access this feature.', ErrorCodes.AUTH_ERROR, 401);
    }
    
    if (status === 429) {
      throw new AppError('You have reached your daily limit. Upgrade to Pro for unlimited access.', ErrorCodes.RATE_LIMIT_ERROR, 429);
    }
    
    if (status === 500) {
      throw new AppError('Server error. Please try again later.', ErrorCodes.UNKNOWN_ERROR, 500);
    }
  }

  if (error?.request) {
    // Request was made but no response received
    throw new AppError('Network error. Please check your connection.', ErrorCodes.NETWORK_ERROR, 0);
  }

  // Something happened in setting up the request
  throw new AppError(getErrorMessage(error), ErrorCodes.UNKNOWN_ERROR, 500);
};

export const handleFileUploadError = (error) => {
  console.error('File Upload Error:', error);

  if (error?.message?.includes('size')) {
    throw new AppError('File size exceeds the limit (10MB).', ErrorCodes.VALIDATION_ERROR, 400);
  }

  if (error?.message?.includes('type')) {
    throw new AppError('Invalid file type. Please upload PDF, images, or documents.', ErrorCodes.VALIDATION_ERROR, 400);
  }

  throw new AppError('Failed to upload file. Please try again.', ErrorCodes.UPLOAD_ERROR, 500);
};

export const handleAIError = (error) => {
  console.error('AI Error:', error);

  if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
    throw new AppError('AI service quota exceeded. Please try again later.', ErrorCodes.AI_ERROR, 429);
  }

  if (error?.message?.includes('timeout')) {
    throw new AppError('AI request timed out. Please try again.', ErrorCodes.AI_ERROR, 504);
  }

  throw new AppError('Failed to generate content. Please try again.', ErrorCodes.AI_ERROR, 500);
};

export const handleDatabaseError = (error) => {
  console.error('Database Error:', error);

  if (error?.message?.includes('duplicate')) {
    throw new AppError('This item already exists.', ErrorCodes.VALIDATION_ERROR, 409);
  }

  if (error?.message?.includes('foreign key')) {
    throw new AppError('Referenced item not found.', ErrorCodes.VALIDATION_ERROR, 404);
  }

  throw new AppError('Database error. Please try again.', ErrorCodes.DATABASE_ERROR, 500);
};

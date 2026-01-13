import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error.code = 'VALIDATION_ERROR';
    errorResponse.error.message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error.code = 'UNAUTHORIZED';
    errorResponse.error.message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error.code = 'FORBIDDEN';
    errorResponse.error.message = 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error.code = 'NOT_FOUND';
    errorResponse.error.message = 'Resource not found';
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorResponse.error.code = 'FILE_TOO_LARGE';
    errorResponse.error.message = 'File size exceeds limit';
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    delete error.stack;
  } else {
    (errorResponse.error as any).stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
}
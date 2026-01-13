export function createError(message: string, statusCode: number, code?: string, details?: any): Error {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  error.code = code || 'GENERIC_ERROR';
  error.details = details;
  return error;
}
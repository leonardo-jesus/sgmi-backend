import type { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'internal_server_error';

  // Log error for debugging
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: error.message,
    statusCode,
    code,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: code,
    message: error.isOperational
      ? error.message
      : 'An internal server error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};

export const createError = (
  message: string,
  statusCode: number = 500,
  code: string = 'internal_server_error'
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

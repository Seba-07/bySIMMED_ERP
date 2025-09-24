import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  let message = error.message || 'Internal server error';

  // Detectar errores específicos de MongoDB
  if (error.message.includes('buffering timed out')) {
    statusCode = 503; // Service Unavailable
    message = 'Database temporarily unavailable. Please check your database connection and try again.';
  } else if (error.message.includes('bufferCommands = false')) {
    statusCode = 503;
    message = 'Database connection not established. Please ensure your database is running and accessible.';
  } else if (error.message.includes('MongooseError') || error.message.includes('MongoError')) {
    statusCode = 503;
    message = 'Database service unavailable. Please try again later.';
  }

  console.error('Error:', {
    originalMessage: error.message,
    finalMessage: message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  res.status(statusCode).json({
    success: false,
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      originalError: error.message,
      stack: error.stack
    })
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error: AppError = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code ?? 'APP_ERROR' },
    });
  }
  // Mongo duplicate key
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] ?? 'field';
    return res.status(409).json({
      success: false,
      error: { message: `${field} already exists`, code: 'DUPLICATE_KEY' },
    });
  }
  console.error('UNHANDLED ERROR:', err);
  return res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL',
    },
  });
};

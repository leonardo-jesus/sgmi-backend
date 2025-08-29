import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid request data',
          details: result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      req.body = result.data;
      next();
    } catch (_error) {
      return res.status(500).json({
        success: false,
        error: 'validation_processing_error',
      });
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid query parameters',
          details: result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      req.query = result.data;
      next();
    } catch (_error) {
      return res.status(500).json({
        success: false,
        error: 'validation_processing_error',
      });
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid URL parameters',
          details: result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      req.params = result.data;
      next();
    } catch (_error) {
      return res.status(500).json({
        success: false,
        error: 'validation_processing_error',
      });
    }
  };
};

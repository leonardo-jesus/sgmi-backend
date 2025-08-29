import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../types/common.js';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'missing_token',
        message: 'Authorization token is required',
      });
    }

    const token = authHeader.slice(7);
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'server_configuration_error',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    (req as AuthenticatedRequest).user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      error: 'invalid_token',
      message: 'Invalid or expired token',
    });
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as AuthenticatedRequest).user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'insufficient_permissions',
        message: 'You do not have permission to access this resource',
      });
    }
    next();
  };
};

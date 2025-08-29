import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import {
  validateBody,
  validateParams,
} from '../../../shared/middleware/validation.js';
import {
  LoginSchema,
  RefreshTokenSchema,
  RegisterSchema,
  UuidParamSchema,
} from '../../../shared/validation/schemas.js';
import { AuthController } from './AuthController.js';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', validateBody(LoginSchema), authController.login);
router.post('/register', validateBody(RegisterSchema), authController.register);
router.post(
  '/refresh',
  validateBody(RefreshTokenSchema),
  authController.refreshToken
);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.post('/revoke-all', authenticate, authController.revokeAllTokens);

// Admin routes (manager and director only)
router.get(
  '/users',
  authenticate,
  authorize(['MANAGER', 'DIRECTOR']),
  authController.getAllUsers
);

router.patch(
  '/users/:id/role',
  authenticate,
  authorize(['DIRECTOR']),
  validateParams(UuidParamSchema),
  validateBody(z.object({ role: z.enum(['OPERATOR', 'MANAGER', 'DIRECTOR']) })),
  authController.updateUserRole
);

router.delete(
  '/users/:id',
  authenticate,
  authorize(['DIRECTOR']),
  validateParams(UuidParamSchema),
  authController.deleteUser
);

export { router as authRouter };

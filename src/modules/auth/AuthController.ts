import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import { AuthService } from './AuthService.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await this.authService.login({ email, password });

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    const userId = await this.authService.register({
      name,
      email,
      password,
      role,
    });

    res.status(201).json({
      success: true,
      data: { id: userId },
      message: 'User registered successfully',
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken: refreshTokenValue } = req.body;

    const result = await this.authService.refreshToken(refreshTokenValue);

    res.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully',
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  });

  getProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      res.json({
        success: true,
        data: req.user,
      });
    }
  );

  revokeAllTokens = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      await this.authService.revokeAllTokensForUser(req.user.id);

      res.json({
        success: true,
        message: 'All tokens revoked successfully',
      });
    }
  );

  // Admin endpoints
  getAllUsers = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const users = await this.authService.getAllUsers();

      res.json({
        success: true,
        data: users,
        meta: {
          count: users.length,
        },
      });
    }
  );

  updateUserRole = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const { role } = req.body;

      await this.authService.updateUserRole(id, role);

      res.json({
        success: true,
        message: 'User role updated successfully',
      });
    }
  );

  deleteUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      await this.authService.deleteUser(id);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    }
  );
}

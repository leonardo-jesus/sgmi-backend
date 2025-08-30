import { prisma } from '../../shared/database/prisma.js';
import { createError } from '../../shared/middleware/errorHandler.js';
import type { User, UserRole, UUID } from '../../shared/types/common.js';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  verifyRefreshToken,
} from '../../shared/utils/auth.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: Omit<User, 'created_at'>;
  tokens: AuthTokens;
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        throw createError('Invalid credentials', 401, 'invalid_credentials');
      }

      const passwordValid = await comparePassword(
        credentials.password,
        user.passwordHash
      );

      if (!passwordValid) {
        throw createError('Invalid credentials', 401, 'invalid_credentials');
      }

      const tokens = await this.generateTokensForUser(user);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
        },
        tokens,
      };
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError('Login failed', 500, 'login_failed');
    }
  }

  async register(data: RegisterData): Promise<UUID> {
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw createError('Email already in use', 409, 'email_in_use');
      }

      const hashedPassword = await hashPassword(data.password);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          passwordHash: hashedPassword,
        },
      });

      return user.id;
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError('Registration failed', 500, 'registration_failed');
    }
  }

  async refreshToken(
    refreshTokenValue: string
  ): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token exists in database
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenValue },
        include: { user: true },
      });

      if (!tokenRecord) {
        throw createError('Invalid refresh token', 401, 'invalid_token');
      }

      // Verify token signature and extract payload
      const payload = verifyRefreshToken(refreshTokenValue);

      if (payload.sub !== tokenRecord.userId) {
        throw createError('Invalid refresh token', 401, 'invalid_token');
      }

      if (!tokenRecord.user) {
        throw createError('User not found', 401, 'user_not_found');
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        sub: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      });

      return { accessToken };
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError('Token refresh failed', 401, 'token_refresh_failed');
    }
  }

  async logout(refreshTokenValue: string): Promise<void> {
    try {
      // Remove refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshTokenValue },
      });
    } catch (_error) {
      // Logout should be forgiving - if token doesn't exist, that's fine
      console.error('Logout error (non-critical):', _error);
    }
  }

  async revokeAllTokensForUser(userId: UUID): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    } catch (_error) {
      throw createError('Failed to revoke tokens', 500, 'revoke_tokens_failed');
    }
  }

  private async generateTokensForUser(user: User): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      sub: user.id,
    });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // Admin functions
  async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return users;
    } catch (_error) {
      throw createError('Failed to fetch users', 500, 'fetch_users_failed');
    }
  }

  async updateUserRole(userId: UUID, role: UserRole): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404, 'user_not_found');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to update user role',
        500,
        'update_role_failed'
      );
    }
  }

  async deleteUser(userId: UUID): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404, 'user_not_found');
      }

      // Delete user (cascade will handle refresh tokens)
      await prisma.user.delete({
        where: { id: userId },
      });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError('Failed to delete user', 500, 'delete_user_failed');
    }
  }
}

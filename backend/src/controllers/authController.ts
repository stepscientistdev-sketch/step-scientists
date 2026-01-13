import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authService } from '../services/authService';
import { AuthRequest, RefreshTokenRequest } from '../types';
import { createError } from '../middleware/createError';

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        throw createError(
          'Validation failed',
          400,
          'VALIDATION_ERROR'
        );
      }

      const { username, email, password }: AuthRequest & { email: string } = value;

      // Register user
      const authResponse = await authService.register(username, email, password);

      res.status(201).json({
        success: true,
        data: authResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        throw createError(
          'Validation failed',
          400,
          'VALIDATION_ERROR'
        );
      }

      const { username, password }: AuthRequest = value;

      // Login user
      const authResponse = await authService.login(username, password);

      res.json({
        success: true,
        data: authResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        throw createError(
          'Validation failed',
          400,
          'VALIDATION_ERROR'
        );
      }

      const { refreshToken }: RefreshTokenRequest = value;

      // Refresh token
      const authResponse = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: authResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // For now, logout is handled client-side by removing tokens
      // In the future, we could implement token blacklisting
      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
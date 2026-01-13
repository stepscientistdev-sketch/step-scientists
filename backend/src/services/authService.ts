import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../config/database';
import { GameMode } from '../types';
import { Player, PlayerModel, AuthResponse, JWTPayload, RefreshTokenPayload } from '../types';
import { createError } from '../middleware/createError';

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET!;
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
    
    if (!this.JWT_SECRET || !this.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets must be configured');
    }
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await database('players')
      .where('username', username)
      .orWhere('email', email)
      .first();

    if (existingUser) {
      if (existingUser.username === username) {
        throw createError('Username already exists', 400, 'USERNAME_EXISTS');
      }
      if (existingUser.email === email) {
        throw createError('Email already exists', 400, 'EMAIL_EXISTS');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    // Create player
    const playerId = uuidv4();
    const now = new Date();

    const playerData: Partial<PlayerModel> = {
      id: playerId,
      username,
      email,
      password_hash: passwordHash,
      step_data: JSON.stringify({
        total_steps: 0,
        daily_steps: 0,
        last_updated: now.toISOString(),
      }),
      resources: JSON.stringify({
        cells: 0,
        experience_points: 0,
      }),
      current_mode: GameMode.DISCOVERY,
      last_sync: now,
    };

    await database('players').insert(playerData);

    // Get created player
    const player = await this.getPlayerById(playerId);
    if (!player) {
      throw createError('Failed to create player', 500, 'CREATION_FAILED');
    }

    // Generate tokens
    const { token, refreshToken } = this.generateTokens(player);

    return {
      token,
      refreshToken,
      player: this.sanitizePlayer(player),
    };
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    // Find player
    const playerModel = await database('players')
      .where('username', username)
      .first() as PlayerModel;

    if (!playerModel) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, playerModel.password_hash);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const player = this.modelToPlayer(playerModel);

    // Generate tokens
    const { token, refreshToken } = this.generateTokens(player);

    return {
      token,
      refreshToken,
      player: this.sanitizePlayer(player),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      
      const player = await this.getPlayerById(decoded.playerId);
      if (!player) {
        throw createError('Player not found', 404, 'PLAYER_NOT_FOUND');
      }

      // Generate new tokens
      const tokens = this.generateTokens(player);

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        player: this.sanitizePlayer(player),
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }
      throw error;
    }
  }

  private generateTokens(player: Player): { token: string; refreshToken: string } {
    const payload = {
      playerId: player.id,
      username: player.username,
    };

    const refreshPayload = {
      playerId: player.id,
      tokenVersion: 1,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(refreshPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);

    return { token, refreshToken };
  }

  private async getPlayerById(id: string): Promise<Player | null> {
    const playerModel = await database('players')
      .where('id', id)
      .first() as PlayerModel;

    return playerModel ? this.modelToPlayer(playerModel) : null;
  }

  private modelToPlayer(model: PlayerModel): Player {
    return {
      id: model.id,
      username: model.username,
      email: model.email,
      password_hash: model.password_hash,
      stepData: JSON.parse(model.step_data),
      resources: JSON.parse(model.resources),
      currentMode: model.current_mode,
      guild_id: model.guild_id,
      lastSync: model.last_sync,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  private sanitizePlayer(player: Player): Omit<Player, 'password_hash'> {
    const { password_hash, ...sanitized } = player;
    return sanitized;
  }
}

export const authService = new AuthService();
import {Request, Response} from 'express';
import {lifetimeAchievementService} from '../services/lifetimeAchievementService';
import {ApiResponse} from '../types';
import {AuthenticatedRequest} from '../middleware/auth';

export class LifetimeAchievementController {
  /**
   * Get lifetime achievements for the authenticated player
   */
  async getAchievements(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;

      if (!playerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Player not authenticated',
          },
        } as ApiResponse);
      }

      const achievements = await lifetimeAchievementService.getByPlayerId(playerId);

      if (!achievements) {
        // Initialize if not exists
        const newAchievements = await lifetimeAchievementService.initializeForPlayer(playerId);
        return res.json({
          success: true,
          data: newAchievements,
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: achievements,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting achievements:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get achievements',
        },
      } as ApiResponse);
    }
  }

  /**
   * Update achievements based on current total steps
   */
  async updateAchievements(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const {totalSteps} = req.body;

      if (!playerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Player not authenticated',
          },
        } as ApiResponse);
      }

      if (typeof totalSteps !== 'number' || totalSteps < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid total steps value',
          },
        } as ApiResponse);
      }

      const result = await lifetimeAchievementService.updateAchievements(playerId, totalSteps);

      res.json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error('Error updating achievements:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update achievements',
        },
      } as ApiResponse);
    }
  }

  /**
   * Claim daily bonus cells
   */
  async claimDailyBonus(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;

      if (!playerId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Player not authenticated',
          },
        } as ApiResponse);
      }

      const bonusCells = await lifetimeAchievementService.claimDailyBonus(playerId);

      res.json({
        success: true,
        data: {
          bonusCells,
          claimed: bonusCells > 0,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to claim daily bonus',
        },
      } as ApiResponse);
    }
  }
}

export const lifetimeAchievementController = new LifetimeAchievementController();

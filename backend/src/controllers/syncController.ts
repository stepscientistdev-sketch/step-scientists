import { Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { 
  SyncPlayerDataRequest, 
  SyncPlayerDataResponse,
  DataConflict,
  ConflictResolutionStrategy 
} from '../types';

export class SyncController {
  async syncPlayerData(req: Request, res: Response): Promise<void> {
    try {
      const { playerId, stepData, operations, lastSync } = req.body as SyncPlayerDataRequest;
      
      // Validate request
      if (!playerId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Player ID is required',
          },
        });
        return;
      }

      // Process sync request
      const syncResult = await syncService.syncPlayerData({
        playerId,
        stepData,
        operations,
        lastSync: new Date(lastSync),
      });

      const response: SyncPlayerDataResponse = {
        success: syncResult.success,
        syncedDays: syncResult.syncedDays,
        errors: syncResult.errors,
        conflicts: syncResult.conflicts || [],
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: 'Failed to sync player data',
        },
      });
    }
  }

  async resolveConflict(req: Request, res: Response): Promise<void> {
    try {
      const { conflictId, strategy, resolvedValue } = req.body;
      
      if (!conflictId || !strategy) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Conflict ID and strategy are required',
          },
        });
        return;
      }

      const result = await syncService.resolveConflict(conflictId, {
        strategy: strategy as ConflictResolutionStrategy,
        resolvedValue,
        timestamp: new Date(),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Conflict resolution error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFLICT_RESOLUTION_ERROR',
          message: 'Failed to resolve conflict',
        },
      });
    }
  }

  async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const { playerId } = req.params;
      
      if (!playerId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Player ID is required',
          },
        });
        return;
      }

      const status = await syncService.getSyncStatus(playerId);
      
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Get sync status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_STATUS_ERROR',
          message: 'Failed to get sync status',
        },
      });
    }
  }

  async rollbackTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      
      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Transaction ID is required',
          },
        });
        return;
      }

      await syncService.rollbackTransaction(transactionId);
      
      res.json({
        success: true,
        message: 'Transaction rolled back successfully',
      });
    } catch (error) {
      console.error('Rollback error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ROLLBACK_ERROR',
          message: 'Failed to rollback transaction',
        },
      });
    }
  }

  async getConflictHistory(req: Request, res: Response): Promise<void> {
    try {
      const { playerId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      if (!playerId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Player ID is required',
          },
        });
        return;
      }

      const conflicts = await syncService.getConflictHistory(
        playerId, 
        Number(limit), 
        Number(offset)
      );
      
      res.json({
        success: true,
        data: conflicts,
      });
    } catch (error) {
      console.error('Get conflict history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFLICT_HISTORY_ERROR',
          message: 'Failed to get conflict history',
        },
      });
    }
  }
}

export const syncController = new SyncController();
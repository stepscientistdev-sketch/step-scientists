import { Request, Response, NextFunction } from 'express';
import { SyncPlayerDataRequest } from '../types';

export function validateSyncRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    const { playerId, stepData, operations, lastSync } = req.body as SyncPlayerDataRequest;

    // Validate required fields
    if (!playerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Player ID is required',
        },
      });
      return;
    }

    if (!stepData) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Step data is required',
        },
      });
      return;
    }

    if (!lastSync) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Last sync timestamp is required',
        },
      });
      return;
    }

    // Validate step data structure
    if (typeof stepData.totalSteps !== 'number' || stepData.totalSteps < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid total steps value',
        },
      });
      return;
    }

    if (typeof stepData.dailySteps !== 'number' || stepData.dailySteps < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid daily steps value',
        },
      });
      return;
    }

    // Validate operations array
    if (operations && !Array.isArray(operations)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Operations must be an array',
        },
      });
      return;
    }

    // Validate each operation
    if (operations) {
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        if (!operation.id || !operation.type || !operation.playerId || !operation.timestamp) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid operation at index ${i}: missing required fields`,
            },
          });
          return;
        }

        const validTypes = ['step_update', 'mode_switch', 'cell_inspect', 'stepling_fusion'];
        if (!validTypes.includes(operation.type)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid operation type at index ${i}: ${operation.type}`,
            },
          });
          return;
        }

        // Validate operation belongs to the same player
        if (operation.playerId !== playerId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Operation at index ${i} belongs to different player`,
            },
          });
          return;
        }
      }
    }

    // Validate lastSync is a valid date
    const syncDate = new Date(lastSync);
    if (isNaN(syncDate.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid last sync timestamp',
        },
      });
      return;
    }

    // Check if sync is not too old (7 days limit)
    const daysSinceSync = Math.abs(
      new Date().getTime() - syncDate.getTime()
    ) / (1000 * 60 * 60 * 24);

    if (daysSinceSync > 7) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SYNC_TOO_OLD',
          message: 'Sync data is older than 7-day limit',
          details: { daysSinceSync },
        },
      });
      return;
    }

    // Validate step data is reasonable
    if (stepData.totalSteps > 1000000) { // 1 million steps seems unreasonable
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Total steps value is unreasonably high',
        },
      });
      return;
    }

    if (stepData.dailySteps > 100000) { // 100k daily steps is very high
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Daily steps value is unreasonably high',
        },
      });
      return;
    }

    // Validate operations count
    if (operations && operations.length > 1000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Too many operations in queue',
          details: { count: operations.length, max: 1000 },
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Sync request validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate sync request',
      },
    });
  }
}
import { database } from '../config/database';
import { 
  SyncPlayerDataRequest,
  SyncResult,
  DataConflict,
  ConflictResolution,
  ConflictResolutionStrategy,
  SyncOperation,
  StepData,
  Player,
  SyncStatus,
  ValidationResult,
  ValidationError
} from '../types';

export class SyncService {
  async syncPlayerData(request: SyncPlayerDataRequest): Promise<SyncResult & { conflicts?: DataConflict[] }> {
    const trx = await database.transaction();
    
    try {
      const { playerId, stepData, operations, lastSync } = request;
      
      // Validate offline data
      const validationResult = this.validateOfflineData(request);
      if (!validationResult.isValid) {
        await trx.rollback();
        return {
          success: false,
          syncedDays: 0,
          errors: validationResult.errors.map(e => e.message),
          lastSyncDate: new Date(),
        };
      }

      // Get current server data
      const serverPlayer = await this.getPlayerData(playerId, trx);
      if (!serverPlayer) {
        await trx.rollback();
        return {
          success: false,
          syncedDays: 0,
          errors: ['Player not found'],
          lastSyncDate: new Date(),
        };
      }

      // Detect conflicts
      const conflicts = await this.detectConflicts(serverPlayer, request);
      
      if (conflicts.length > 0) {
        // Store conflicts for resolution
        await this.storeConflicts(playerId, conflicts, trx);
        
        // Auto-resolve conflicts where possible
        const autoResolvedConflicts = await this.autoResolveConflicts(conflicts);
        const remainingConflicts = conflicts.filter(c => 
          !autoResolvedConflicts.find(ar => ar.field === c.field)
        );

        if (remainingConflicts.length > 0) {
          await trx.rollback();
          return {
            success: false,
            syncedDays: 0,
            errors: ['Conflicts detected that require manual resolution'],
            lastSyncDate: new Date(),
            conflicts: remainingConflicts,
          };
        }

        // Apply auto-resolved conflicts
        await this.applyConflictResolutions(playerId, autoResolvedConflicts, trx);
      }

      // Process sync operations
      const processedOperations = await this.processOperations(playerId, operations, trx);
      const failedOperations = processedOperations.filter(op => !op.success);

      if (failedOperations.length > 0) {
        console.warn(`${failedOperations.length} operations failed during sync`);
      }

      // Update player data
      await this.updatePlayerData(playerId, stepData, trx);
      
      // Update sync timestamp
      await this.updateSyncTimestamp(playerId, trx);

      await trx.commit();

      return {
        success: true,
        syncedDays: this.calculateSyncedDays(lastSync),
        errors: [],
        lastSyncDate: new Date(),
        conflicts: [],
      };

    } catch (error) {
      await trx.rollback();
      console.error('Sync service error:', error);
      throw error;
    }
  }

  private validateOfflineData(request: SyncPlayerDataRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    // Validate step data
    if (request.stepData) {
      if (request.stepData.totalSteps < 0) {
        errors.push({
          type: 'NEGATIVE_STEPS',
          message: 'Total steps cannot be negative',
          data: request.stepData,
        });
      }

      if (request.stepData.dailySteps > 50000) {
        warnings.push({
          type: 'SUSPICIOUS_ACTIVITY',
          message: 'Daily steps exceed normal range',
          data: request.stepData,
        });
      }
    }

    // Check sync age (7-day offline limit)
    const daysSinceSync = Math.abs(
      new Date().getTime() - new Date(request.lastSync).getTime()
    ) / (1000 * 60 * 60 * 24);

    if (daysSinceSync > 7) {
      errors.push({
        type: 'OFFLINE_LIMIT_EXCEEDED',
        message: 'Data is older than 7-day limit',
        data: { daysSinceSync },
      });
    }

    // Validate operations
    if (request.operations && request.operations.length > 1000) {
      errors.push({
        type: 'QUEUE_OVERFLOW',
        message: 'Too many pending operations',
        data: { count: request.operations.length },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async getPlayerData(playerId: string, trx: any): Promise<Player | null> {
    try {
      const player = await trx('players')
        .where('id', playerId)
        .first();

      if (!player) return null;

      return {
        ...player,
        stepData: player.step_data ? JSON.parse(player.step_data) : null,
        resources: player.resources ? JSON.parse(player.resources) : null,
        lastSync: new Date(player.last_sync),
        createdAt: new Date(player.created_at),
      };
    } catch (error) {
      console.error('Error getting player data:', error);
      return null;
    }
  }

  private async detectConflicts(serverPlayer: Player, request: SyncPlayerDataRequest): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];

    // Check step data conflicts
    if (serverPlayer.stepData && request.stepData) {
      if (serverPlayer.stepData.totalSteps !== request.stepData.totalSteps) {
        conflicts.push({
          field: 'stepCount',
          localValue: request.stepData.totalSteps,
          serverValue: serverPlayer.stepData.totalSteps,
          lastSyncTimestamp: new Date(request.lastSync),
          conflictTimestamp: new Date(),
        });
      }
    }

    // Check resources conflicts
    if (serverPlayer.resources && request.stepData) {
      // This would involve more complex logic to detect resource conflicts
      // For now, we'll skip this as it requires game mode calculations
    }

    return conflicts;
  }

  private async storeConflicts(playerId: string, conflicts: DataConflict[], trx: any): Promise<void> {
    for (const conflict of conflicts) {
      await trx('sync_conflicts').insert({
        id: this.generateId(),
        player_id: playerId,
        field: conflict.field,
        local_value: JSON.stringify(conflict.localValue),
        server_value: JSON.stringify(conflict.serverValue),
        last_sync_timestamp: conflict.lastSyncTimestamp,
        conflict_timestamp: conflict.conflictTimestamp,
        status: 'pending',
        created_at: new Date(),
      });
    }
  }

  private async autoResolveConflicts(conflicts: DataConflict[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      let strategy: ConflictResolutionStrategy;
      let resolvedValue: any;

      switch (conflict.field) {
        case 'stepCount':
          // For step counts, prefer client data if within 7-day window
          const daysDiff = Math.abs(
            new Date().getTime() - conflict.conflictTimestamp.getTime()
          ) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 7) {
            strategy = ConflictResolutionStrategy.CLIENT_WINS;
            resolvedValue = conflict.localValue;
          } else {
            strategy = ConflictResolutionStrategy.SERVER_WINS;
            resolvedValue = conflict.serverValue;
          }
          break;

        case 'resources':
          // Take higher values for resources
          strategy = ConflictResolutionStrategy.MERGE_VALUES;
          resolvedValue = this.mergeResources(conflict.localValue, conflict.serverValue);
          break;

        default:
          // Default to server wins for unknown fields
          strategy = ConflictResolutionStrategy.SERVER_WINS;
          resolvedValue = conflict.serverValue;
      }

      resolutions.push({
        field: conflict.field,
        strategy,
        resolvedValue,
        timestamp: new Date(),
      });
    }

    return resolutions;
  }

  private mergeResources(localResources: any, serverResources: any): any {
    return {
      cells: Math.max(localResources.cells || 0, serverResources.cells || 0),
      experiencePoints: Math.max(
        localResources.experiencePoints || 0, 
        serverResources.experiencePoints || 0
      ),
    };
  }

  private async applyConflictResolutions(
    playerId: string, 
    resolutions: ConflictResolution[], 
    trx: any
  ): Promise<void> {
    for (const resolution of resolutions) {
      // Update the player data with resolved values
      switch (resolution.field) {
        case 'stepCount':
          await trx('players')
            .where('id', playerId)
            .update({
              step_data: JSON.stringify({
                totalSteps: resolution.resolvedValue,
                dailySteps: resolution.resolvedValue, // Simplified for now
                lastUpdated: new Date(),
              }),
            });
          break;

        case 'resources':
          await trx('players')
            .where('id', playerId)
            .update({
              resources: JSON.stringify(resolution.resolvedValue),
            });
          break;
      }

      // Mark conflict as resolved
      await trx('sync_conflicts')
        .where('player_id', playerId)
        .where('field', resolution.field)
        .update({
          status: 'resolved',
          resolution_strategy: resolution.strategy,
          resolved_value: JSON.stringify(resolution.resolvedValue),
          resolved_at: new Date(),
        });
    }
  }

  private async processOperations(
    playerId: string, 
    operations: SyncOperation[], 
    trx: any
  ): Promise<Array<{ operationId: string; success: boolean; error?: string }>> {
    const results = [];

    for (const operation of operations) {
      try {
        await this.processOperation(playerId, operation, trx);
        results.push({
          operationId: operation.id,
          success: true,
        });
      } catch (error) {
        results.push({
          operationId: operation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private async processOperation(playerId: string, operation: SyncOperation, trx: any): Promise<void> {
    switch (operation.type) {
      case 'step_update':
        await this.processStepUpdate(playerId, operation, trx);
        break;
      case 'mode_switch':
        await this.processModeSwitch(playerId, operation, trx);
        break;
      case 'cell_inspect':
        await this.processCellInspect(playerId, operation, trx);
        break;
      case 'stepling_fusion':
        await this.processSteplingFusion(playerId, operation, trx);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async processStepUpdate(playerId: string, operation: SyncOperation, trx: any): Promise<void> {
    // Update step data in database
    const stepData = operation.data;
    await trx('players')
      .where('id', playerId)
      .update({
        step_data: JSON.stringify(stepData),
        updated_at: new Date(),
      });
  }

  private async processModeSwitch(playerId: string, operation: SyncOperation, trx: any): Promise<void> {
    // Update game mode
    const { mode } = operation.data;
    await trx('players')
      .where('id', playerId)
      .update({
        current_mode: mode,
        updated_at: new Date(),
      });
  }

  private async processCellInspect(playerId: string, operation: SyncOperation, trx: any): Promise<void> {
    // Process cell inspection - this would involve species discovery logic
    console.log('Processing cell inspect:', operation.data);
    // Implementation would go here
  }

  private async processSteplingFusion(playerId: string, operation: SyncOperation, trx: any): Promise<void> {
    // Process stepling fusion
    console.log('Processing stepling fusion:', operation.data);
    // Implementation would go here
  }

  private async updatePlayerData(playerId: string, stepData: StepData, trx: any): Promise<void> {
    await trx('players')
      .where('id', playerId)
      .update({
        step_data: JSON.stringify(stepData),
        updated_at: new Date(),
      });
  }

  private async updateSyncTimestamp(playerId: string, trx: any): Promise<void> {
    await trx('players')
      .where('id', playerId)
      .update({
        last_sync: new Date(),
      });
  }

  private calculateSyncedDays(lastSync: Date): number {
    const daysDiff = Math.abs(
      new Date().getTime() - new Date(lastSync).getTime()
    ) / (1000 * 60 * 60 * 24);
    return Math.ceil(daysDiff);
  }

  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<any> {
    const trx = await database.transaction();
    
    try {
      // Get conflict details
      const conflict = await trx('sync_conflicts')
        .where('id', conflictId)
        .first();

      if (!conflict) {
        throw new Error('Conflict not found');
      }

      // Apply resolution
      await this.applyConflictResolutions(
        conflict.player_id, 
        [{ ...resolution, field: conflict.field }], 
        trx
      );

      await trx.commit();
      return { success: true };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getSyncStatus(playerId: string): Promise<SyncStatus> {
    try {
      const player = await database('players')
        .where('id', playerId)
        .first();

      if (!player) {
        throw new Error('Player not found');
      }

      const pendingConflicts = await database('sync_conflicts')
        .where('player_id', playerId)
        .where('status', 'pending')
        .count('* as count')
        .first();

      return {
        playerId,
        lastSync: new Date(player.last_sync),
        pendingConflicts: Number(pendingConflicts?.count || 0),
        syncInProgress: false, // This would be tracked in a separate table/cache
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    // Implementation for rollback would depend on how transactions are tracked
    // For now, this is a placeholder
    console.log(`Rolling back transaction: ${transactionId}`);
  }

  async getConflictHistory(playerId: string, limit: number, offset: number): Promise<DataConflict[]> {
    try {
      const conflicts = await database('sync_conflicts')
        .where('player_id', playerId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return conflicts.map(conflict => ({
        field: conflict.field,
        localValue: JSON.parse(conflict.local_value),
        serverValue: JSON.parse(conflict.server_value),
        lastSyncTimestamp: new Date(conflict.last_sync_timestamp),
        conflictTimestamp: new Date(conflict.conflict_timestamp),
      }));
    } catch (error) {
      console.error('Error getting conflict history:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const syncService = new SyncService();
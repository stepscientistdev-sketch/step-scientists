import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import { 
  SyncOperation, 
  SyncResult, 
  DataConflict, 
  ConflictResolutionStrategy,
  Player,
  StepData,
  ValidationResult 
} from '../types';

export interface SyncManager {
  syncPlayerData(playerId: string): Promise<SyncResult>;
  resolveConflict(conflict: DataConflict): Promise<ConflictResolution>;
  rollbackTransaction(transactionId: string): Promise<void>;
  queueOperation(operation: SyncOperation): Promise<void>;
  processQueue(): Promise<QueueResult[]>;
  validateOfflineData(data: OfflinePlayerData): ValidationResult;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedValue: any;
  timestamp: Date;
}

export interface QueueResult {
  operationId: string;
  success: boolean;
  error?: string;
}

export interface OfflinePlayerData {
  playerId: string;
  stepData: StepData;
  operations: SyncOperation[];
  lastSync: Date;
}

export interface BackupData {
  id: string;
  playerId: string;
  data: any;
  timestamp: Date;
  type: 'pre_sync' | 'rollback_point';
}

export interface ServerSyncResponse {
  success: boolean;
  syncedDays?: number;
  errors?: string[];
  conflicts?: DataConflict[];
}

const STORAGE_KEYS = {
  SYNC_QUEUE: 'sync_operation_queue',
  CONFLICT_LOG: 'sync_conflict_log',
  BACKUP_DATA: 'backup_data',
  SYNC_STATUS: 'sync_status',
  LAST_SUCCESSFUL_SYNC: 'last_successful_sync',
};

const SYNC_CONSTANTS = {
  MAX_QUEUE_SIZE: 1000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
  CONFLICT_TIMEOUT: 300000, // 5 minutes
  BACKUP_RETENTION_DAYS: 7,
};

class SyncManagerImpl implements SyncManager {
  private syncInProgress: boolean = false;
  private retryTimer: NodeJS.Timeout | null = null;

  async syncPlayerData(playerId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedDays: 0,
        errors: ['Sync already in progress'],
        lastSyncDate: new Date(),
      };
    }

    this.syncInProgress = true;

    try {
      // Create backup before sync
      const backupId = await this.createBackup(playerId);

      // Get offline data
      const offlineData = await this.getOfflinePlayerData(playerId);
      
      // Validate offline data
      const validationResult = this.validateOfflineData(offlineData);
      if (!validationResult.isValid) {
        await this.rollbackFromBackup(backupId);
        return {
          success: false,
          syncedDays: 0,
          errors: validationResult.errors.map(e => e.message),
          lastSyncDate: new Date(),
        };
      }

      // Process sync queue
      const queueResults = await this.processQueue();
      const failedOperations = queueResults.filter(r => !r.success);

      if (failedOperations.length > 0) {
        // Partial sync failure - log conflicts
        await this.logSyncConflicts(failedOperations);
      }

      // Sync with server
      const serverSyncResult = await this.syncWithServer(playerId, offlineData);
      
      if (serverSyncResult.success) {
        // Update last sync timestamp
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_SUCCESSFUL_SYNC,
          new Date().toISOString()
        );

        // Clean up old backups
        await this.cleanupOldBackups();
      } else {
        // Rollback on server sync failure
        await this.rollbackFromBackup(backupId);
      }

      return serverSyncResult;

    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        syncedDays: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        lastSyncDate: new Date(),
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncWithServer(playerId: string, offlineData: OfflinePlayerData): Promise<SyncResult> {
    try {
      // Send offline data to server
      const response = await apiClient.post<ServerSyncResponse>('/sync/player-data', {
        playerId,
        stepData: offlineData.stepData,
        operations: offlineData.operations,
        lastSync: offlineData.lastSync,
      });

      const responseData = response.data;

      if (responseData.success) {
        // Handle server conflicts if any
        if (responseData.conflicts && responseData.conflicts.length > 0) {
          await this.handleServerConflicts(responseData.conflicts);
        }

        return {
          success: true,
          syncedDays: responseData.syncedDays || 0,
          errors: [],
          lastSyncDate: new Date(),
        };
      } else {
        return {
          success: false,
          syncedDays: 0,
          errors: responseData.errors || ['Server sync failed'],
          lastSyncDate: new Date(),
        };
      }
    } catch (error) {
      console.error('Server sync error:', error);
      return {
        success: false,
        syncedDays: 0,
        errors: ['Network error during sync'],
        lastSyncDate: new Date(),
      };
    }
  }

  private async handleServerConflicts(conflicts: DataConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict);
      
      // Apply resolution
      await this.applyConflictResolution(conflict, resolution);
    }
  }

  async resolveConflict(conflict: DataConflict): Promise<ConflictResolution> {
    try {
      // Determine resolution strategy based on conflict type
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

        case 'steplingCollection':
          // Merge collections (union of steplings)
          strategy = ConflictResolutionStrategy.MERGE_VALUES;
          resolvedValue = this.mergeCollections(conflict.localValue, conflict.serverValue);
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

      // Log conflict resolution
      await this.logConflictResolution(conflict, strategy, resolvedValue);

      return {
        strategy,
        resolvedValue,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('Error resolving conflict:', error);
      
      // Fallback to server wins
      return {
        strategy: ConflictResolutionStrategy.SERVER_WINS,
        resolvedValue: conflict.serverValue,
        timestamp: new Date(),
      };
    }
  }

  private mergeCollections(localCollection: any[], serverCollection: any[]): any[] {
    const merged = [...localCollection];
    
    serverCollection.forEach(serverItem => {
      const exists = merged.find(localItem => localItem.id === serverItem.id);
      if (!exists) {
        merged.push(serverItem);
      }
    });

    return merged;
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

  private async applyConflictResolution(
    conflict: DataConflict, 
    resolution: ConflictResolution
  ): Promise<void> {
    try {
      // Apply the resolved value to local storage
      const storageKey = `player_${conflict.field}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(resolution.resolvedValue));
      
      console.log(`Applied conflict resolution for ${conflict.field}:`, resolution.strategy);
    } catch (error) {
      console.error('Error applying conflict resolution:', error);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      const backup = await this.getBackupData(transactionId);
      if (!backup) {
        throw new Error(`Backup not found for transaction: ${transactionId}`);
      }

      // Restore data from backup
      await this.restoreFromBackup(backup);
      
      // Log rollback
      console.log(`Rolled back transaction: ${transactionId}`);
      
    } catch (error) {
      console.error('Rollback error:', error);
      throw error;
    }
  }

  async queueOperation(operation: SyncOperation): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      
      // Check queue size limit
      if (queue.length >= SYNC_CONSTANTS.MAX_QUEUE_SIZE) {
        // Remove oldest operations
        queue.splice(0, queue.length - SYNC_CONSTANTS.MAX_QUEUE_SIZE + 1);
      }

      queue.push(operation);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      
    } catch (error) {
      console.error('Error queuing operation:', error);
    }
  }

  async processQueue(): Promise<QueueResult[]> {
    try {
      const queue = await this.getSyncQueue();
      const results: QueueResult[] = [];

      for (const operation of queue) {
        try {
          await this.processOperation(operation);
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

      // Clear processed operations
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));

      return results;
    } catch (error) {
      console.error('Error processing queue:', error);
      return [];
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'step_update':
        await this.processStepUpdate(operation);
        break;
      case 'mode_switch':
        await this.processModeSwitch(operation);
        break;
      case 'cell_inspect':
        await this.processCellInspect(operation);
        break;
      case 'stepling_fusion':
        await this.processSteplingFusion(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async processStepUpdate(operation: SyncOperation): Promise<void> {
    // Process step update operation
    console.log('Processing step update:', operation.data);
  }

  private async processModeSwitch(operation: SyncOperation): Promise<void> {
    // Process mode switch operation
    console.log('Processing mode switch:', operation.data);
  }

  private async processCellInspect(operation: SyncOperation): Promise<void> {
    // Process cell inspection operation
    console.log('Processing cell inspect:', operation.data);
  }

  private async processSteplingFusion(operation: SyncOperation): Promise<void> {
    // Process stepling fusion operation
    console.log('Processing stepling fusion:', operation.data);
  }

  validateOfflineData(data: OfflinePlayerData): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate step data
    if (data.stepData) {
      if (data.stepData.totalSteps < 0) {
        errors.push({
          type: 'NEGATIVE_STEPS',
          message: 'Total steps cannot be negative',
          data: data.stepData,
        });
      }

      if (data.stepData.dailySteps > 50000) {
        warnings.push({
          type: 'SUSPICIOUS_ACTIVITY',
          message: 'Daily steps exceed normal range',
          data: data.stepData,
        });
      }
    }

    // Validate operations
    if (data.operations && data.operations.length > SYNC_CONSTANTS.MAX_QUEUE_SIZE) {
      errors.push({
        type: 'QUEUE_OVERFLOW',
        message: 'Too many pending operations',
        data: { count: data.operations.length },
      });
    }

    // Check sync age
    const daysSinceSync = Math.abs(
      new Date().getTime() - data.lastSync.getTime()
    ) / (1000 * 60 * 60 * 24);

    if (daysSinceSync > 7) {
      errors.push({
        type: 'OFFLINE_LIMIT_EXCEEDED',
        message: 'Data is older than 7-day limit',
        data: { daysSinceSync },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async getSyncQueue(): Promise<SyncOperation[]> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!queueData) return [];

      const queue = JSON.parse(queueData);
      return queue.map((op: any) => ({
        ...op,
        timestamp: new Date(op.timestamp),
      }));
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  private async getOfflinePlayerData(playerId: string): Promise<OfflinePlayerData> {
    try {
      // Get step data
      const stepDataStr = await AsyncStorage.getItem(`player_stepData_${playerId}`);
      const stepData = stepDataStr ? JSON.parse(stepDataStr) : null;

      // Get operations queue
      const operations = await this.getSyncQueue();

      // Get last sync timestamp
      const lastSyncStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SUCCESSFUL_SYNC);
      const lastSync = lastSyncStr ? new Date(lastSyncStr) : new Date(0);

      return {
        playerId,
        stepData: stepData || { totalSteps: 0, dailySteps: 0, lastUpdated: new Date() },
        operations: operations.filter(op => op.playerId === playerId),
        lastSync,
      };
    } catch (error) {
      console.error('Error getting offline player data:', error);
      throw error;
    }
  }

  private async createBackup(playerId: string): Promise<string> {
    try {
      const backupId = `backup_${playerId}_${Date.now()}`;
      const playerData = await this.getOfflinePlayerData(playerId);

      const backup: BackupData = {
        id: backupId,
        playerId,
        data: playerData,
        timestamp: new Date(),
        type: 'pre_sync',
      };

      await AsyncStorage.setItem(
        `${STORAGE_KEYS.BACKUP_DATA}_${backupId}`,
        JSON.stringify(backup)
      );

      return backupId;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  private async getBackupData(backupId: string): Promise<BackupData | null> {
    try {
      const backupStr = await AsyncStorage.getItem(`${STORAGE_KEYS.BACKUP_DATA}_${backupId}`);
      if (!backupStr) return null;

      const backup = JSON.parse(backupStr);
      return {
        ...backup,
        timestamp: new Date(backup.timestamp),
      };
    } catch (error) {
      console.error('Error getting backup data:', error);
      return null;
    }
  }

  private async restoreFromBackup(backup: BackupData): Promise<void> {
    try {
      const playerData = backup.data as OfflinePlayerData;
      
      // Restore step data
      await AsyncStorage.setItem(
        `player_stepData_${backup.playerId}`,
        JSON.stringify(playerData.stepData)
      );

      // Restore operations queue
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_QUEUE,
        JSON.stringify(playerData.operations)
      );

      console.log(`Restored data from backup: ${backup.id}`);
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  private async rollbackFromBackup(backupId: string): Promise<void> {
    const backup = await this.getBackupData(backupId);
    if (backup) {
      await this.restoreFromBackup(backup);
    }
  }

  private async logSyncConflicts(failedOperations: QueueResult[]): Promise<void> {
    try {
      const conflictLog = {
        timestamp: new Date(),
        failedOperations,
      };

      await AsyncStorage.setItem(
        `${STORAGE_KEYS.CONFLICT_LOG}_${Date.now()}`,
        JSON.stringify(conflictLog)
      );
    } catch (error) {
      console.error('Error logging sync conflicts:', error);
    }
  }

  private async logConflictResolution(
    conflict: DataConflict,
    strategy: ConflictResolutionStrategy,
    resolvedValue: any
  ): Promise<void> {
    try {
      const resolutionLog = {
        conflict,
        strategy,
        resolvedValue,
        timestamp: new Date(),
      };

      await AsyncStorage.setItem(
        `conflict_resolution_${Date.now()}`,
        JSON.stringify(resolutionLog)
      );
    } catch (error) {
      console.error('Error logging conflict resolution:', error);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.BACKUP_DATA));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - SYNC_CONSTANTS.BACKUP_RETENTION_DAYS);

      for (const key of backupKeys) {
        const backupStr = await AsyncStorage.getItem(key);
        if (backupStr) {
          const backup = JSON.parse(backupStr);
          const backupDate = new Date(backup.timestamp);
          
          if (backupDate < cutoffDate) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}

export const syncManager = new SyncManagerImpl();
// Core game types
export enum GameMode {
  DISCOVERY = 'discovery',
  TRAINING = 'training'
}

export enum RarityTier {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface SteplingStats {
  health: number;
  attack: number;
  defense: number;
  special: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  effect: string;
}

export interface Species {
  id: string;
  name: string;
  description: string;
  rarityTier: RarityTier;
  baseStats: SteplingStats;
  abilities: Ability[];
  evolutionSprites: string[];
  discoveryCount: number;
  isDiscovered: boolean;
  createdBy?: string;
}

export interface Stepling {
  id: string;
  playerId: string;
  speciesId: string;
  level: number;
  fusionLevel: number;
  currentStats: SteplingStats;
  hasSuboptimalFusion?: boolean; // Flag to track if this stepling was ever created from non-max fusion
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  username: string;
  stepData: StepData;
  resources: Resources;
  currentMode: GameMode;
  guildId?: string;
  lastSync: Date;
  createdAt: Date;
}

export interface StepData {
  totalSteps: number;
  dailySteps: number;
  lastUpdated: Date;
  source?: string;
  validated?: boolean;
}

export interface Resources {
  cells: number;
  experiencePoints: number;
}

export interface MagnifyingGlass {
  tier: RarityTier;
  advancementRange: [number, number];
}

// Lifetime Achievement types
export interface LifetimeAchievement {
  id: string;
  playerId: string;
  bonusCellsPerDay: number;
  discoveryEfficiency: number;
  trainingEfficiency: number;
  clickPower: number;
  experienceBankCap: number;
  trainingRosterSlots: number;
  releaseXpBonus: number;
  unlockedAchievements: string[];
  lastDailyBonusClaim: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementDefinition {
  steps: number;
  name: string;
  rewards: {
    bonusCellsPerDay?: number;
    discoveryEfficiency?: number;
    trainingEfficiency?: number;
    clickPower?: number;
    experienceBankCap?: number;
    trainingRosterSlots?: number;
    releaseXpBonus?: number;
  };
}

export interface AchievementUnlockResult {
  newAchievements: AchievementDefinition[];
  updatedBonuses: LifetimeAchievement;
}

// Step tracking and sync types
export interface OfflineStepData {
  date: Date;
  steps: number;
  timestamp: Date;
  synced: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'EXCESSIVE_STEPS' | 'INVALID_DATE' | 'NEGATIVE_STEPS' | 'OFFLINE_LIMIT_EXCEEDED';
  message: string;
  data?: any;
}

export interface ValidationWarning {
  type: 'SUSPICIOUS_ACTIVITY' | 'DATA_GAP' | 'UNUSUAL_PATTERN';
  message: string;
  data?: any;
}

export interface SyncResult {
  success: boolean;
  syncedDays: number;
  errors: string[];
  lastSyncDate: Date;
}

// Sync operation types
export interface SyncOperation {
  type: 'step_update' | 'mode_switch' | 'cell_inspect' | 'stepling_fusion';
  data: any;
  timestamp: Date;
  playerId: string;
  id: string;
}

export interface DataConflict {
  field: string;
  localValue: any;
  serverValue: any;
  lastSyncTimestamp: Date;
  conflictTimestamp: Date;
}

export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MERGE_VALUES = 'merge_values',
  MANUAL_REVIEW = 'manual_review'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  player: Player;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
};
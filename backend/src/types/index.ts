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
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  regen: number; // Percentage of HP regenerated, capped at 100%
  lifesteal: number; // Percentage of attack damage stolen as HP, capped at 100%
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
  rarity_tier: RarityTier;
  base_stats: SteplingStats;
  abilities: Ability[];
  evolution_sprites: string[];
  discovery_count: number;
  max_fusion_level: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Stepling {
  id: string;
  player_id: string;
  species_id: string;
  level: number;
  fusion_level: number;
  current_stats: SteplingStats;
  has_suboptimal_fusion?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Player {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  stepData: StepData;
  resources: Resources;
  currentMode: GameMode;
  guild_id?: string;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
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

// Sync-related types
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

export interface ConflictResolution {
  field?: string;
  strategy: ConflictResolutionStrategy;
  resolvedValue: any;
  timestamp: Date;
}

export interface SyncResult {
  success: boolean;
  syncedDays: number;
  errors: string[];
  lastSyncDate: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'EXCESSIVE_STEPS' | 'INVALID_DATE' | 'NEGATIVE_STEPS' | 'OFFLINE_LIMIT_EXCEEDED' | 'QUEUE_OVERFLOW';
  message: string;
  data?: any;
}

export interface ValidationWarning {
  type: 'SUSPICIOUS_ACTIVITY' | 'DATA_GAP' | 'UNUSUAL_PATTERN';
  message: string;
  data?: any;
}

export interface SyncPlayerDataRequest {
  playerId: string;
  stepData: StepData;
  operations: SyncOperation[];
  lastSync: Date;
}

export interface SyncPlayerDataResponse {
  success: boolean;
  syncedDays: number;
  errors: string[];
  conflicts: DataConflict[];
  timestamp: Date;
}

export interface SyncStatus {
  playerId: string;
  lastSync: Date;
  pendingConflicts: number;
  syncInProgress: boolean;
}

// API Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  player: Omit<Player, 'password_hash'>;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// JWT Payload
export interface JWTPayload {
  playerId: string;
  username: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  playerId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

// Database models
export interface PlayerModel {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  step_data: string; // JSON string
  resources: string; // JSON string
  current_mode: GameMode;
  guild_id?: string;
  last_sync: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SpeciesModel {
  id: string;
  name: string;
  description: string;
  rarity_tier: RarityTier;
  base_stats: string; // JSON string
  abilities: string; // JSON string
  evolution_sprites: string; // JSON string
  discovery_count: number;
  max_fusion_level: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SteplingModel {
  id: string;
  player_id: string;
  species_id: string;
  level: number;
  fusion_level: number;
  current_stats: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface SyncConflictModel {
  id: string;
  player_id: string;
  field: string;
  local_value: string; // JSON string
  server_value: string; // JSON string
  last_sync_timestamp: Date;
  conflict_timestamp: Date;
  status: 'pending' | 'resolved' | 'rejected';
  resolution_strategy?: ConflictResolutionStrategy;
  resolved_value?: string; // JSON string
  resolved_at?: Date;
  created_at: Date;
}

// Lifetime Achievement types
export interface LifetimeAchievement {
  id: string;
  player_id: string;
  bonus_cells_per_day: number;
  discovery_efficiency: number;
  training_efficiency: number;
  click_power: number;
  experience_bank_cap: number;
  training_roster_slots: number;
  release_xp_bonus: number;
  unlocked_achievements: string[];
  last_daily_bonus_claim: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface LifetimeAchievementModel {
  id: string;
  player_id: string;
  bonus_cells_per_day: number;
  discovery_efficiency: number;
  training_efficiency: number;
  click_power: number;
  experience_bank_cap: number;
  training_roster_slots: number;
  release_xp_bonus: number;
  unlocked_achievements: string; // JSON string
  last_daily_bonus_claim: Date | null;
  created_at: Date;
  updated_at: Date;
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

// Express Request extension
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}

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

export interface Resources {
  cells: number;
  experiencePoints: number;
}

export interface MagnifyingGlass {
  tier: RarityTier;
  advancementRange: [number, number];
}
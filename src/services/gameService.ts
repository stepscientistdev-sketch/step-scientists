import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameMode, Resources, MagnifyingGlass, RarityTier } from '../types';
import { steplingService } from './steplingService';

export interface GameModeData {
  mode: GameMode;
  stepsInMode: number;
  lastModeSwitch: Date;
  totalStepsInDiscovery: number;
  totalStepsInTraining: number;
}

export interface MilestoneProgress {
  totalSteps: number;
  milestones: {
    [key: number]: {
      reached: boolean;
      rewardClaimed: boolean;
      tier: RarityTier;
    };
  };
}

// Constants for resource conversion
const CONVERSION_RATES = {
  DISCOVERY: {
    STEPS_PER_CELL: 1000,
  },
  TRAINING: {
    STEPS_PER_XP: 10,
  },
};

// Milestone thresholds and rewards
const MILESTONES = {
  5000: { tier: RarityTier.UNCOMMON, name: 'Uncommon Magnifying Glass' },
  10000: { tier: RarityTier.RARE, name: 'Rare Magnifying Glass' },
  50000: { tier: RarityTier.EPIC, name: 'Epic Magnifying Glass' },
  100000: { tier: RarityTier.LEGENDARY, name: 'Legendary Magnifying Glass' },
};

const STORAGE_KEYS = {
  GAME_MODE_DATA: 'game_mode_data',
  MILESTONE_PROGRESS: 'milestone_progress',
  MAGNIFYING_GLASSES: 'magnifying_glasses',
};

class GameServiceImpl {
  private currentModeData: GameModeData | null = null;
  private milestoneProgress: MilestoneProgress | null = null;

  async initializeGameData(): Promise<void> {
    try {
      // Load existing game mode data
      const modeDataStr = await AsyncStorage.getItem(STORAGE_KEYS.GAME_MODE_DATA);
      if (modeDataStr) {
        const data = JSON.parse(modeDataStr);
        this.currentModeData = {
          ...data,
          lastModeSwitch: new Date(data.lastModeSwitch),
        };
      } else {
        // Initialize with default data
        this.currentModeData = {
          mode: GameMode.DISCOVERY,
          stepsInMode: 0,
          lastModeSwitch: new Date(),
          totalStepsInDiscovery: 0,
          totalStepsInTraining: 0,
        };
        await this.saveModeData();
      }

      // Load milestone progress
      const milestoneStr = await AsyncStorage.getItem(STORAGE_KEYS.MILESTONE_PROGRESS);
      if (milestoneStr) {
        this.milestoneProgress = JSON.parse(milestoneStr);
      } else {
        // Initialize milestone progress
        this.milestoneProgress = {
          totalSteps: 0,
          milestones: {
            5000: { reached: false, rewardClaimed: false, tier: RarityTier.UNCOMMON },
            10000: { reached: false, rewardClaimed: false, tier: RarityTier.RARE },
            50000: { reached: false, rewardClaimed: false, tier: RarityTier.EPIC },
            100000: { reached: false, rewardClaimed: false, tier: RarityTier.LEGENDARY },
          },
        };
        await this.saveMilestoneProgress();
      }
    } catch (error) {
      console.error('Error initializing game data:', error);
      throw new Error('Failed to initialize game data');
    }
  }

  async switchGameMode(newMode: GameMode): Promise<GameModeData> {
    if (!this.currentModeData) {
      await this.initializeGameData();
    }

    if (this.currentModeData!.mode === newMode) {
      return this.currentModeData!;
    }

    // Update mode data
    this.currentModeData!.mode = newMode;
    this.currentModeData!.stepsInMode = 0; // Reset steps in new mode
    this.currentModeData!.lastModeSwitch = new Date();

    await this.saveModeData();
    return this.currentModeData!;
  }

  async updateStepsInMode(newSteps: number): Promise<{ resources: Resources; newMilestones: MagnifyingGlass[]; trainingResults?: { [steplingId: string]: any } }> {
    if (!this.currentModeData) {
      await this.initializeGameData();
    }

    const previousSteps = this.currentModeData!.stepsInMode;
    const stepDifference = newSteps - previousSteps;

    if (stepDifference <= 0) {
      return { resources: { cells: 0, experiencePoints: 0 }, newMilestones: [] };
    }

    // Update step counts
    this.currentModeData!.stepsInMode = newSteps;
    
    if (this.currentModeData!.mode === GameMode.DISCOVERY) {
      this.currentModeData!.totalStepsInDiscovery += stepDifference;
    } else {
      this.currentModeData!.totalStepsInTraining += stepDifference;
    }

    // Update total steps for milestone tracking
    const previousTotalSteps = this.milestoneProgress!.totalSteps;
    this.milestoneProgress!.totalSteps += stepDifference;

    // Calculate resources earned based on cumulative steps in mode (FIXED)
    const previousResources = this.calculateResourcesFromSteps(previousSteps, this.currentModeData!.mode);
    const newResources = this.calculateResourcesFromSteps(newSteps, this.currentModeData!.mode);
    
    const earnedResources: Resources = {
      cells: newResources.cells - previousResources.cells,
      experiencePoints: newResources.experiencePoints - previousResources.experiencePoints,
    };

    // If in training mode and we earned experience points, distribute to training roster
    let trainingResults;
    if (this.currentModeData!.mode === GameMode.TRAINING && earnedResources.experiencePoints > 0) {
      try {
        trainingResults = await steplingService.distributeExperienceToRoster(earnedResources.experiencePoints);
      } catch (error) {
        console.error('Error distributing experience to roster:', error);
      }
    }

    // Check for new milestones
    const newMilestones = await this.checkMilestones(previousTotalSteps, this.milestoneProgress!.totalSteps);

    // Save updated data
    await this.saveModeData();
    await this.saveMilestoneProgress();

    return { resources: earnedResources, newMilestones, trainingResults };
  }

  calculateResourcesFromSteps(steps: number, mode: GameMode): Resources {
    const resources: Resources = { cells: 0, experiencePoints: 0 };

    if (mode === GameMode.DISCOVERY) {
      resources.cells = Math.floor(steps / CONVERSION_RATES.DISCOVERY.STEPS_PER_CELL);
    } else if (mode === GameMode.TRAINING) {
      resources.experiencePoints = Math.floor(steps / CONVERSION_RATES.TRAINING.STEPS_PER_XP);
    }

    return resources;
  }

  private async checkMilestones(previousTotal: number, newTotal: number): Promise<MagnifyingGlass[]> {
    const newMilestones: MagnifyingGlass[] = [];

    for (const [thresholdStr, milestoneData] of Object.entries(MILESTONES)) {
      const threshold = parseInt(thresholdStr);
      const milestoneState = this.milestoneProgress!.milestones[threshold];

      // Check if milestone was just reached
      if (previousTotal < threshold && newTotal >= threshold && !milestoneState.reached) {
        milestoneState.reached = true;
        
        // Create magnifying glass reward
        const magnifyingGlass: MagnifyingGlass = {
          tier: milestoneData.tier,
          advancementRange: this.getAdvancementRangeForTier(milestoneData.tier),
        };

        newMilestones.push(magnifyingGlass);

        // Add to inventory
        await this.addMagnifyingGlassToInventory(magnifyingGlass);
      }
    }

    return newMilestones;
  }

  private getAdvancementRangeForTier(tier: RarityTier): [number, number] {
    // Based on design document: magnifying glass modifies advancement range to 96-100 for tiers up to glass level
    switch (tier) {
      case RarityTier.UNCOMMON:
        return [99, 100]; // Slight improvement for uncommon
      case RarityTier.RARE:
        return [98, 100]; // Better for rare
      case RarityTier.EPIC:
        return [97, 100]; // Even better for epic
      case RarityTier.LEGENDARY:
        return [96, 100]; // Best for legendary
      default:
        return [100, 100]; // No improvement for common
    }
  }

  async getMagnifyingGlassInventory(): Promise<MagnifyingGlass[]> {
    try {
      const inventoryStr = await AsyncStorage.getItem(STORAGE_KEYS.MAGNIFYING_GLASSES);
      if (inventoryStr) {
        return JSON.parse(inventoryStr);
      }
      return [];
    } catch (error) {
      console.error('Error getting magnifying glass inventory:', error);
      return [];
    }
  }

  private async addMagnifyingGlassToInventory(magnifyingGlass: MagnifyingGlass): Promise<void> {
    try {
      const inventory = await this.getMagnifyingGlassInventory();
      inventory.push(magnifyingGlass);
      await AsyncStorage.setItem(STORAGE_KEYS.MAGNIFYING_GLASSES, JSON.stringify(inventory));
    } catch (error) {
      console.error('Error adding magnifying glass to inventory:', error);
    }
  }

  async useMagnifyingGlass(tier: RarityTier): Promise<boolean> {
    try {
      const inventory = await this.getMagnifyingGlassInventory();
      const glassIndex = inventory.findIndex(glass => glass.tier === tier);
      
      if (glassIndex === -1) {
        return false; // Glass not found in inventory
      }

      // Remove the glass from inventory (single use)
      inventory.splice(glassIndex, 1);
      await AsyncStorage.setItem(STORAGE_KEYS.MAGNIFYING_GLASSES, JSON.stringify(inventory));
      
      return true;
    } catch (error) {
      console.error('Error using magnifying glass:', error);
      return false;
    }
  }

  getCurrentModeData(): GameModeData | null {
    return this.currentModeData;
  }

  getMilestoneProgress(): MilestoneProgress | null {
    return this.milestoneProgress;
  }

  getConversionRates() {
    return CONVERSION_RATES;
  }

  getMilestoneThresholds() {
    return MILESTONES;
  }

  private async saveModeData(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAME_MODE_DATA, JSON.stringify(this.currentModeData));
    } catch (error) {
      console.error('Error saving mode data:', error);
    }
  }

  private async saveMilestoneProgress(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MILESTONE_PROGRESS, JSON.stringify(this.milestoneProgress));
    } catch (error) {
      console.error('Error saving milestone progress:', error);
    }
  }

  // Method to get available milestones for UI display
  getAvailableMilestones(): Array<{
    threshold: number;
    tier: RarityTier;
    name: string;
    reached: boolean;
    rewardClaimed: boolean;
    progress: number;
  }> {
    if (!this.milestoneProgress) {
      return [];
    }

    return Object.entries(MILESTONES).map(([thresholdStr, milestoneData]) => {
      const threshold = parseInt(thresholdStr);
      const milestoneState = this.milestoneProgress!.milestones[threshold];
      const progress = Math.min(this.milestoneProgress!.totalSteps / threshold, 1);

      return {
        threshold,
        tier: milestoneData.tier,
        name: milestoneData.name,
        reached: milestoneState.reached,
        rewardClaimed: milestoneState.rewardClaimed,
        progress,
      };
    });
  }

  // Method to claim milestone reward
  async claimMilestoneReward(threshold: number): Promise<MagnifyingGlass | null> {
    if (!this.milestoneProgress) {
      return null;
    }

    const milestoneState = this.milestoneProgress.milestones[threshold];
    if (!milestoneState.reached || milestoneState.rewardClaimed) {
      return null;
    }

    milestoneState.rewardClaimed = true;
    await this.saveMilestoneProgress();

    const milestoneData = MILESTONES[threshold as keyof typeof MILESTONES];
    const magnifyingGlass: MagnifyingGlass = {
      tier: milestoneData.tier,
      advancementRange: this.getAdvancementRangeForTier(milestoneData.tier),
    };

    await this.addMagnifyingGlassToInventory(magnifyingGlass);
    return magnifyingGlass;
  }
}

export const gameService = new GameServiceImpl();
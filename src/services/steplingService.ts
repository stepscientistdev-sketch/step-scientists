import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stepling, Species, SteplingStats, RarityTier } from '../types';
import { apiClient } from './apiClient';

export interface FusionResult {
  success: boolean;
  newStepling?: Stepling;
  error?: string;
  warningData?: {
    stepling1MaxLevel: number;
    stepling2MaxLevel: number;
    stepling1Level: number;
    stepling2Level: number;
  };
}

export interface LevelUpResult {
  success: boolean;
  updatedStepling?: Stepling;
  error?: string;
}

export interface SteplingCollection {
  steplings: Stepling[];
  totalCount: number;
}

const STORAGE_KEYS = {
  STEPLINGS: 'player_steplings',
  TRAINING_ROSTER: 'training_roster',
};

class SteplingServiceImpl {
  private steplings: Stepling[] = [];
  private trainingRoster: string[] = []; // Array of stepling IDs

  async initializeSteplings(): Promise<void> {
    try {
      // Load steplings from local storage first
      const steplingsStr = await AsyncStorage.getItem(STORAGE_KEYS.STEPLINGS);
      if (steplingsStr) {
        this.steplings = JSON.parse(steplingsStr).map((s: any) => ({
          ...s,
          hasSuboptimalFusion: s.hasSuboptimalFusion || false, // Default to false for existing steplings
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));
      }

      // Load training roster
      const rosterStr = await AsyncStorage.getItem(STORAGE_KEYS.TRAINING_ROSTER);
      if (rosterStr) {
        this.trainingRoster = JSON.parse(rosterStr);
      }

      // Sync with server
      await this.syncWithServer();
    } catch (error) {
      console.error('Error initializing steplings:', error);
      throw new Error('Failed to initialize steplings');
    }
  }

  async getSteplingCollection(filters?: {
    speciesId?: string;
    minLevel?: number;
    maxLevel?: number;
    fusionLevel?: number;
  }): Promise<SteplingCollection> {
    let filteredSteplings = [...this.steplings];

    if (filters) {
      if (filters.speciesId) {
        filteredSteplings = filteredSteplings.filter(s => s.speciesId === filters.speciesId);
      }
      if (filters.minLevel) {
        filteredSteplings = filteredSteplings.filter(s => s.level >= filters.minLevel!);
      }
      if (filters.maxLevel) {
        filteredSteplings = filteredSteplings.filter(s => s.level <= filters.maxLevel!);
      }
      if (filters.fusionLevel) {
        filteredSteplings = filteredSteplings.filter(s => s.fusionLevel === filters.fusionLevel);
      }
    }

    return {
      steplings: filteredSteplings,
      totalCount: filteredSteplings.length,
    };
  }

  async fuseSteplings(stepling1Id: string, stepling2Id: string, discoveredSpeciesCount: number, forceNonMaxFusion: boolean = false): Promise<FusionResult> {
    try {
      const stepling1 = this.steplings.find(s => s.id === stepling1Id);
      const stepling2 = this.steplings.find(s => s.id === stepling2Id);

      if (!stepling1 || !stepling2) {
        return { success: false, error: 'One or both steplings not found' };
      }

      // Validate fusion requirements
      if (stepling1.speciesId !== stepling2.speciesId) {
        return { success: false, error: 'Steplings must be of the same species to fuse' };
      }

      if (stepling1.fusionLevel !== stepling2.fusionLevel) {
        return { success: false, error: 'Steplings must be at the same fusion level to fuse' };
      }

      // Check fusion level cap (species count × 2)
      const maxFusionLevel = discoveredSpeciesCount * 2;
      if (stepling1.fusionLevel >= maxFusionLevel) {
        return { success: false, error: `Maximum fusion level reached (${maxFusionLevel})` };
      }

      // Check if either stepling is not at max level and warn
      const maxLevel1 = stepling1.fusionLevel * 10;
      const maxLevel2 = stepling2.fusionLevel * 10;
      const isNonMaxFusion = stepling1.level < maxLevel1 || stepling2.level < maxLevel2;

      if (isNonMaxFusion && !forceNonMaxFusion) {
        // Return a special result that indicates a warning is needed
        return { 
          success: false, 
          error: 'NON_MAX_FUSION_WARNING',
          warningData: {
            stepling1MaxLevel: maxLevel1,
            stepling2MaxLevel: maxLevel2,
            stepling1Level: stepling1.level,
            stepling2Level: stepling2.level
          }
        };
      }

      // Calculate new stepling stats
      const newFusionLevel = stepling1.fusionLevel + 1;
      
      // Get species data for base stats
      const species = await this.getSpeciesData(stepling1.speciesId);
      if (!species) {
        return { success: false, error: 'Species data not found' };
      }

      // Calculate fusion bonus based on original stepling levels
      const fusionBonus = this.calculateFusionBonus(stepling1, stepling2, species.baseStats);
      
      // Determine if the new stepling should be marked as ever fused non-max
      const hasSuboptimalFusion = isNonMaxFusion || stepling1.hasSuboptimalFusion || stepling2.hasSuboptimalFusion;
      
      // Create new stepling with fusion bonuses
      const newStepling: Stepling = {
        id: this.generateSteplingId(),
        playerId: stepling1.playerId,
        speciesId: stepling1.speciesId,
        level: 1, // Start at level 1
        fusionLevel: newFusionLevel,
        currentStats: {
          health: species.baseStats.health + fusionBonus.health,
          attack: species.baseStats.attack + fusionBonus.attack,
          defense: species.baseStats.defense + fusionBonus.defense,
          special: species.baseStats.special + fusionBonus.special,
        },
        hasSuboptimalFusion,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Remove original steplings and add new one
      this.steplings = this.steplings.filter(s => s.id !== stepling1Id && s.id !== stepling2Id);
      this.steplings.push(newStepling);

      // Update training roster if needed
      this.updateTrainingRosterAfterFusion(stepling1Id, stepling2Id, newStepling.id);

      // Save to storage and sync with server
      await this.saveSteplings();
      await this.syncFusionWithServer(newStepling, [stepling1Id, stepling2Id]);

      return { success: true, newStepling };
    } catch (error) {
      console.error('Error fusing steplings:', error);
      return { success: false, error: 'Failed to fuse steplings' };
    }
  }

  async levelUpStepling(steplingId: string, experiencePoints: number): Promise<LevelUpResult> {
    try {
      const stepling = this.steplings.find(s => s.id === steplingId);
      if (!stepling) {
        return { success: false, error: 'Stepling not found' };
      }

      const maxLevel = stepling.fusionLevel * 10;
      if (stepling.level >= maxLevel) {
        return { success: false, error: `Stepling is already at maximum level (${maxLevel})` };
      }

      // Get species data for base stats
      const species = await this.getSpeciesData(stepling.speciesId);
      if (!species) {
        return { success: false, error: 'Species data not found' };
      }

      // Calculate how many levels can be gained
      let currentLevel = stepling.level;
      let remainingExp = experiencePoints;
      let newStats = { ...stepling.currentStats };

      while (remainingExp > 0 && currentLevel < maxLevel) {
        const expRequired = currentLevel * 10; // Formula: required_exp = current_level × 10
        
        if (remainingExp >= expRequired) {
          // Level up!
          remainingExp -= expRequired;
          currentLevel++;
          
          // Increase stats by 10% of base stats
          const statIncrease = this.calculateStatIncrease(species.baseStats);
          newStats.health += statIncrease.health;
          newStats.attack += statIncrease.attack;
          newStats.defense += statIncrease.defense;
          newStats.special += statIncrease.special;
        } else {
          break; // Not enough exp for next level
        }
      }

      if (currentLevel === stepling.level) {
        return { success: false, error: 'Not enough experience points to level up' };
      }

      // Update stepling
      const updatedStepling: Stepling = {
        ...stepling,
        level: currentLevel,
        currentStats: newStats,
        updatedAt: new Date(),
      };

      // Update in collection
      const steplingIndex = this.steplings.findIndex(s => s.id === steplingId);
      this.steplings[steplingIndex] = updatedStepling;

      // Save and sync
      await this.saveSteplings();
      await this.syncSteplingWithServer(updatedStepling);

      return { success: true, updatedStepling };
    } catch (error) {
      console.error('Error leveling up stepling:', error);
      return { success: false, error: 'Failed to level up stepling' };
    }
  }

  async distributeExperienceToRoster(totalExperience: number): Promise<{ [steplingId: string]: LevelUpResult }> {
    const results: { [steplingId: string]: LevelUpResult } = {};
    
    if (this.trainingRoster.length === 0) {
      return results;
    }

    const expPerStepling = Math.floor(totalExperience / this.trainingRoster.length);
    
    for (const steplingId of this.trainingRoster) {
      results[steplingId] = await this.levelUpStepling(steplingId, expPerStepling);
    }

    return results;
  }

  async setTrainingRoster(steplingIds: string[]): Promise<boolean> {
    try {
      // Validate all steplings exist
      const validIds = steplingIds.filter(id => this.steplings.some(s => s.id === id));
      
      this.trainingRoster = validIds;
      await AsyncStorage.setItem(STORAGE_KEYS.TRAINING_ROSTER, JSON.stringify(this.trainingRoster));
      
      return true;
    } catch (error) {
      console.error('Error setting training roster:', error);
      return false;
    }
  }

  getTrainingRoster(): Stepling[] {
    return this.trainingRoster
      .map(id => this.steplings.find(s => s.id === id))
      .filter(s => s !== undefined) as Stepling[];
  }

  private calculateFusionBonus(stepling1: Stepling, stepling2: Stepling, baseStats: SteplingStats): SteplingStats {
    // New fusion formula: 10% of average current stats, with minimum of base stats
    const avgStats = {
      health: Math.round((stepling1.currentStats.health + stepling2.currentStats.health) / 2),
      attack: Math.round((stepling1.currentStats.attack + stepling2.currentStats.attack) / 2),
      defense: Math.round((stepling1.currentStats.defense + stepling2.currentStats.defense) / 2),
      special: Math.round((stepling1.currentStats.special + stepling2.currentStats.special) / 2),
    };
    
    // 10% of average current stats as bonus
    const fusionBonus = {
      health: Math.round(avgStats.health * 0.1),
      attack: Math.round(avgStats.attack * 0.1),
      defense: Math.round(avgStats.defense * 0.1),
      special: Math.round(avgStats.special * 0.1),
    };
    
    // Ensure new base stats are at least the original base stats
    return {
      health: Math.max(fusionBonus.health, 0),
      attack: Math.max(fusionBonus.attack, 0),
      defense: Math.max(fusionBonus.defense, 0),
      special: Math.max(fusionBonus.special, 0),
    };
  }

  private calculateStatIncrease(baseStats: SteplingStats): SteplingStats {
    // 10% of base stats, rounded to nearest integer
    return {
      health: Math.round(baseStats.health * 0.1),
      attack: Math.round(baseStats.attack * 0.1),
      defense: Math.round(baseStats.defense * 0.1),
      special: Math.round(baseStats.special * 0.1),
    };
  }

  private updateTrainingRosterAfterFusion(oldId1: string, oldId2: string, newId: string): void {
    // Remove old steplings from roster
    this.trainingRoster = this.trainingRoster.filter(id => id !== oldId1 && id !== oldId2);
    
    // Add new stepling if either old one was in roster
    const wasInRoster = this.trainingRoster.includes(oldId1) || this.trainingRoster.includes(oldId2);
    if (wasInRoster) {
      this.trainingRoster.push(newId);
    }
  }

  private generateSteplingId(): string {
    return `stepling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getSpeciesData(speciesId: string): Promise<Species | null> {
    try {
      const response = await apiClient.get<Species>(`/species/${speciesId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching species data:', error);
      return null;
    }
  }

  private async saveSteplings(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STEPLINGS, JSON.stringify(this.steplings));
    } catch (error) {
      console.error('Error saving steplings:', error);
    }
  }

  private async syncWithServer(): Promise<void> {
    try {
      const response = await apiClient.get<Stepling[]>('/steplings');
      if (response.data) {
        // Merge server data with local data (server wins for conflicts)
        this.steplings = response.data.map((s: any) => ({
          ...s,
          hasSuboptimalFusion: s.has_suboptimal_fusion || s.hasSuboptimalFusion || false,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));
        await this.saveSteplings();
      }
    } catch (error) {
      console.error('Error syncing steplings with server:', error);
      // Continue with local data if sync fails
    }
  }

  private async syncFusionWithServer(newStepling: Stepling, removedIds: string[]): Promise<void> {
    try {
      await apiClient.post('/steplings/fusion', {
        newStepling,
        removedSteplingIds: removedIds,
      });
    } catch (error) {
      console.error('Error syncing fusion with server:', error);
      // Store for later sync
    }
  }

  private async syncSteplingWithServer(stepling: Stepling): Promise<void> {
    try {
      await apiClient.put(`/steplings/${stepling.id}`, stepling);
    } catch (error) {
      console.error('Error syncing stepling with server:', error);
      // Store for later sync
    }
  }

  // Helper method to add a new stepling (used when discovering species)
  async addStepling(speciesId: string, playerId: string): Promise<Stepling> {
    const species = await this.getSpeciesData(speciesId);
    if (!species) {
      throw new Error('Species not found');
    }

    const newStepling: Stepling = {
      id: this.generateSteplingId(),
      playerId,
      speciesId,
      level: 1,
      fusionLevel: 1,
      currentStats: { ...species.baseStats },
      hasSuboptimalFusion: false, // New steplings start as perfect
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.steplings.push(newStepling);
    await this.saveSteplings();
    await this.syncSteplingWithServer(newStepling);

    return newStepling;
  }

  // Get stepling by ID
  getStepling(steplingId: string): Stepling | null {
    return this.steplings.find(s => s.id === steplingId) || null;
  }

  // Get steplings by species
  getSteplingsBySpecies(speciesId: string): Stepling[] {
    return this.steplings.filter(s => s.speciesId === speciesId);
  }

  // Get fusion candidates for a stepling
  getFusionCandidates(steplingId: string): Stepling[] {
    const stepling = this.getStepling(steplingId);
    if (!stepling) return [];

    return this.steplings.filter(s => 
      s.id !== steplingId &&
      s.speciesId === stepling.speciesId &&
      s.fusionLevel === stepling.fusionLevel
    );
  }
}

export const steplingService = new SteplingServiceImpl();
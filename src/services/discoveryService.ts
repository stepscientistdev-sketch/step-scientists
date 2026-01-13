import { speciesService, SpeciesDiscoveryData, DiscoveryResult } from './speciesService';
import { gameService } from './gameService';
import { Species, RarityTier, MagnifyingGlass, Stepling } from '../types';

export interface CellInspectionResult {
  success: boolean;
  species?: Species;
  stepling?: Stepling;
  isNewDiscovery: boolean;
  rarityTier: RarityTier;
  advancementRolls: number;
  magnifyingGlassUsed?: MagnifyingGlass;
  error?: string;
}

export interface DiscoveryOdds {
  baseTier: RarityTier;
  finalTier: RarityTier;
  advancementChance: number;
  magnifyingGlassBonus: boolean;
  selectedSpecies: Species | null;
  rollHistory: number[];
}

// Discovery algorithm constants
const DISCOVERY_CONSTANTS = {
  TIER_ADVANCEMENT_ROLL: 100, // Roll 100 to advance to next tier
  MAGNIFYING_GLASS_RANGE: [96, 100], // Magnifying glass improves odds to 96-100
  MAX_ADVANCEMENT_ROLLS: 10, // Prevent infinite loops
  BASE_RARITY_WEIGHTS: {
    [RarityTier.COMMON]: 1.0,
    [RarityTier.UNCOMMON]: 0.01,
    [RarityTier.RARE]: 0.0001,
    [RarityTier.EPIC]: 0.000001,
    [RarityTier.LEGENDARY]: 0.00000001,
  },
};

class DiscoveryServiceImpl {
  
  async inspectCell(magnifyingGlass?: MagnifyingGlass): Promise<CellInspectionResult> {
    try {
      // Ensure species database is initialized
      await speciesService.initializeSpeciesDatabase();

      // Determine the rarity tier through advancement rolls
      const discoveryOdds = await this.calculateDiscoveryOdds(magnifyingGlass);
      
      if (!discoveryOdds.selectedSpecies) {
        return {
          success: false,
          isNewDiscovery: false,
          rarityTier: RarityTier.COMMON,
          advancementRolls: 0,
          error: 'No species available for discovery',
        };
      }

      // Check if this is a new discovery for the player
      const discoveredSpecies = await speciesService.getDiscoveredSpecies();
      const isNewDiscovery = !discoveredSpecies.some(s => s.id === discoveryOdds.selectedSpecies!.id);

      // Create a new stepling from the discovered species
      const stepling = await this.createSteplingFromSpecies(discoveryOdds.selectedSpecies);

      // Mark species as discovered if it's new
      if (isNewDiscovery) {
        await speciesService.markSpeciesDiscovered(discoveryOdds.selectedSpecies.id);
      }

      // Update discovery statistics
      await this.updateDiscoveryStatistics(discoveryOdds.selectedSpecies.id);

      return {
        success: true,
        species: discoveryOdds.selectedSpecies,
        stepling,
        isNewDiscovery,
        rarityTier: discoveryOdds.finalTier,
        advancementRolls: discoveryOdds.rollHistory.length,
        magnifyingGlassUsed: magnifyingGlass,
      };

    } catch (error) {
      console.error('Error during cell inspection:', error);
      return {
        success: false,
        isNewDiscovery: false,
        rarityTier: RarityTier.COMMON,
        advancementRolls: 0,
        error: error instanceof Error ? error.message : 'Unknown error during discovery',
      };
    }
  }

  private async calculateDiscoveryOdds(magnifyingGlass?: MagnifyingGlass): Promise<DiscoveryOdds> {
    let currentTier = RarityTier.COMMON;
    const rollHistory: number[] = [];
    let advancementRolls = 0;

    // Perform tier advancement rolls
    while (advancementRolls < DISCOVERY_CONSTANTS.MAX_ADVANCEMENT_ROLLS) {
      const roll = Math.floor(Math.random() * 100) + 1; // 1-100
      rollHistory.push(roll);

      // Check if we should advance to next tier
      const shouldAdvance = this.shouldAdvanceTier(roll, currentTier, magnifyingGlass);
      
      if (!shouldAdvance) {
        break;
      }

      // Advance to next tier if possible
      const nextTier = this.getNextRarityTier(currentTier);
      if (nextTier) {
        currentTier = nextTier;
        advancementRolls++;
      } else {
        // Already at highest tier
        break;
      }
    }

    // Select species from the final tier
    const selectedSpecies = await this.selectSpeciesFromTier(currentTier);

    return {
      baseTier: RarityTier.COMMON,
      finalTier: currentTier,
      advancementChance: this.getAdvancementChance(currentTier, magnifyingGlass),
      magnifyingGlassBonus: !!magnifyingGlass,
      selectedSpecies,
      rollHistory,
    };
  }

  private shouldAdvanceTier(roll: number, currentTier: RarityTier, magnifyingGlass?: MagnifyingGlass): boolean {
    // Check if magnifying glass applies to this tier
    if (magnifyingGlass && this.magnifyingGlassApplies(currentTier, magnifyingGlass)) {
      // Use magnifying glass range (96-100)
      return roll >= DISCOVERY_CONSTANTS.MAGNIFYING_GLASS_RANGE[0];
    } else {
      // Use standard advancement (100 only)
      return roll === DISCOVERY_CONSTANTS.TIER_ADVANCEMENT_ROLL;
    }
  }

  private magnifyingGlassApplies(currentTier: RarityTier, magnifyingGlass: MagnifyingGlass): boolean {
    // Magnifying glass works up to its tier level
    const tierOrder = [RarityTier.COMMON, RarityTier.UNCOMMON, RarityTier.RARE, RarityTier.EPIC, RarityTier.LEGENDARY];
    const currentTierIndex = tierOrder.indexOf(currentTier);
    const glassTierIndex = tierOrder.indexOf(magnifyingGlass.tier);
    
    return currentTierIndex <= glassTierIndex;
  }

  private getNextRarityTier(currentTier: RarityTier): RarityTier | null {
    switch (currentTier) {
      case RarityTier.COMMON:
        return RarityTier.UNCOMMON;
      case RarityTier.UNCOMMON:
        return RarityTier.RARE;
      case RarityTier.RARE:
        return RarityTier.EPIC;
      case RarityTier.EPIC:
        return RarityTier.LEGENDARY;
      case RarityTier.LEGENDARY:
        return null; // Already at highest tier
      default:
        return null;
    }
  }

  private getAdvancementChance(tier: RarityTier, magnifyingGlass?: MagnifyingGlass): number {
    if (magnifyingGlass && this.magnifyingGlassApplies(tier, magnifyingGlass)) {
      // 5% chance with magnifying glass (96-100 out of 100)
      return 0.05;
    } else {
      // 1% chance without magnifying glass (100 out of 100)
      return 0.01;
    }
  }

  private async selectSpeciesFromTier(tier: RarityTier): Promise<Species | null> {
    // Get all species in this tier
    const speciesInTier = await speciesService.getSpeciesByRarity(tier);
    
    if (speciesInTier.length === 0) {
      return null;
    }

    // Prioritize undiscovered species
    const undiscoveredSpecies = await speciesService.getUndiscoveredSpecies();
    const undiscoveredInTier = speciesInTier.filter(species => 
      undiscoveredSpecies.some(undiscovered => undiscovered.id === species.id)
    );

    // If there are undiscovered species in this tier, prefer them
    const candidateSpecies = undiscoveredInTier.length > 0 ? undiscoveredInTier : speciesInTier;

    // Apply dynamic balancing - newer species get higher selection odds
    const weightedSpecies = await this.applyDynamicBalancing(candidateSpecies);

    // Select species based on weighted probabilities
    return this.selectWeightedRandom(weightedSpecies);
  }

  private async applyDynamicBalancing(species: Species[]): Promise<Array<{ species: Species; weight: number }>> {
    const weightedSpecies: Array<{ species: Species; weight: number }> = [];

    for (const s of species) {
      const discoveryData = await speciesService.getDiscoveryData(s.id);
      const baseWeight = 1.0;
      
      // Apply discovery multiplier (newer species have higher multipliers)
      const dynamicWeight = baseWeight * (discoveryData?.discoveryMultiplier || 1.0);
      
      weightedSpecies.push({
        species: s,
        weight: dynamicWeight,
      });
    }

    return weightedSpecies;
  }

  private selectWeightedRandom(weightedSpecies: Array<{ species: Species; weight: number }>): Species | null {
    if (weightedSpecies.length === 0) {
      return null;
    }

    // Calculate total weight
    const totalWeight = weightedSpecies.reduce((sum, item) => sum + item.weight, 0);
    
    // Generate random number
    const random = Math.random() * totalWeight;
    
    // Select species based on weight
    let currentWeight = 0;
    for (const item of weightedSpecies) {
      currentWeight += item.weight;
      if (random <= currentWeight) {
        return item.species;
      }
    }

    // Fallback to first species
    return weightedSpecies[0].species;
  }

  private async createSteplingFromSpecies(species: Species): Promise<Stepling> {
    // Generate unique ID for the stepling
    const steplingsCount = await this.getPlayerSteplingsCount();
    const steplingId = `stepling_${Date.now()}_${steplingsCount + 1}`;

    // Create stepling with base stats at level 1, fusion level 1
    const stepling: Stepling = {
      id: steplingId,
      playerId: 'current_player', // This would come from auth service in real implementation
      speciesId: species.id,
      level: 1,
      fusionLevel: 1,
      currentStats: { ...species.baseStats }, // Start with base stats
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return stepling;
  }

  private async getPlayerSteplingsCount(): Promise<number> {
    // This would integrate with stepling storage service
    // For now, return a mock count
    return 0;
  }

  private async updateDiscoveryStatistics(speciesId: string): Promise<void> {
    // Update global discovery count and last discovery date
    const discoveryData = await speciesService.getDiscoveryData(speciesId);
    if (discoveryData) {
      discoveryData.globalDiscoveryCount += 1;
      discoveryData.lastDiscoveryDate = new Date();
    }

    // This would also update server-side statistics in a real implementation
    console.log(`📊 Updated discovery statistics for species: ${speciesId}`);
  }

  // Method to get discovery preview (for UI)
  async getDiscoveryPreview(magnifyingGlass?: MagnifyingGlass): Promise<{
    tierProbabilities: Record<RarityTier, number>;
    magnifyingGlassEffect: string | null;
    availableSpeciesCount: Record<RarityTier, number>;
  }> {
    const tierProbabilities: Record<RarityTier, number> = {
      [RarityTier.COMMON]: 0,
      [RarityTier.UNCOMMON]: 0,
      [RarityTier.RARE]: 0,
      [RarityTier.EPIC]: 0,
      [RarityTier.LEGENDARY]: 0,
    };

    // Calculate probabilities for each tier
    let currentProb = 1.0;
    let currentTier = RarityTier.COMMON;

    while (currentTier) {
      const advancementChance = this.getAdvancementChance(currentTier, magnifyingGlass);
      const stayChance = 1 - advancementChance;
      
      tierProbabilities[currentTier] = currentProb * stayChance;
      
      currentProb *= advancementChance;
      currentTier = this.getNextRarityTier(currentTier);
    }

    // Get available species count per tier
    const availableSpeciesCount: Record<RarityTier, number> = {
      [RarityTier.COMMON]: 0,
      [RarityTier.UNCOMMON]: 0,
      [RarityTier.RARE]: 0,
      [RarityTier.EPIC]: 0,
      [RarityTier.LEGENDARY]: 0,
    };

    for (const tier of Object.values(RarityTier)) {
      const speciesInTier = await speciesService.getSpeciesByRarity(tier);
      availableSpeciesCount[tier] = speciesInTier.length;
    }

    // Describe magnifying glass effect
    let magnifyingGlassEffect = null;
    if (magnifyingGlass) {
      magnifyingGlassEffect = `Improves advancement odds to 5% (96-100) for tiers up to ${magnifyingGlass.tier}`;
    }

    return {
      tierProbabilities,
      magnifyingGlassEffect,
      availableSpeciesCount,
    };
  }

  // Method to simulate discovery (for testing)
  async simulateDiscovery(iterations: number, magnifyingGlass?: MagnifyingGlass): Promise<{
    results: Record<RarityTier, number>;
    averageAdvancementRolls: number;
    totalIterations: number;
  }> {
    const results: Record<RarityTier, number> = {
      [RarityTier.COMMON]: 0,
      [RarityTier.UNCOMMON]: 0,
      [RarityTier.RARE]: 0,
      [RarityTier.EPIC]: 0,
      [RarityTier.LEGENDARY]: 0,
    };

    let totalAdvancementRolls = 0;

    for (let i = 0; i < iterations; i++) {
      const odds = await this.calculateDiscoveryOdds(magnifyingGlass);
      results[odds.finalTier]++;
      totalAdvancementRolls += odds.rollHistory.length;
    }

    return {
      results,
      averageAdvancementRolls: totalAdvancementRolls / iterations,
      totalIterations: iterations,
    };
  }

  getDiscoveryConstants() {
    return DISCOVERY_CONSTANTS;
  }
}

export const discoveryService = new DiscoveryServiceImpl();
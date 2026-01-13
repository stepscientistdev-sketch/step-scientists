import AsyncStorage from '@react-native-async-storage/async-storage';
import { Species, RarityTier, SteplingStats, Ability } from '../types';

export interface SpeciesDiscoveryData {
  speciesId: string;
  globalDiscoveryCount: number;
  lastDiscoveryDate: Date;
  discoveryMultiplier: number; // 1.0 to 10.0 for dynamic balancing
  isActive: boolean; // Whether this species is currently discoverable
}

export interface DiscoveryResult {
  species: Species;
  isNewDiscovery: boolean;
  rarityTier: RarityTier;
  advancementRolls: number; // How many times we advanced tiers
}

// Constants for species system
const SPECIES_CONSTANTS = {
  RARITY_MULTIPLIER: 100, // Each tier is 100x rarer than previous
  BASE_DISCOVERY_RATE: 0.01, // 1% base rate for common tier
  FUSION_LEVEL_MULTIPLIER: 2, // Max fusion level = discovered species * 2
  TIER_ADVANCEMENT_THRESHOLD: 100, // Roll 100 to advance tier
  MAGNIFYING_GLASS_RANGE: [96, 100], // Range for magnifying glass advantage
  DYNAMIC_BALANCING_MIN: 2.0, // Minimum multiplier for newer species
  DYNAMIC_BALANCING_MAX: 10.0, // Maximum multiplier for newer species
};

const STORAGE_KEYS = {
  SPECIES_DATABASE: 'species_database',
  DISCOVERY_DATA: 'species_discovery_data',
  PLAYER_DISCOVERIES: 'player_discoveries',
  SPECIES_EXPANSION: 'species_expansion_data',
};

// Initial species data - 2-3 species per tier at launch
const INITIAL_SPECIES_DATA: Species[] = [
  // Common Tier (Tier 1)
  {
    id: 'common_001',
    name: 'Stepfoot',
    description: 'A small, energetic creature that loves to walk. Its tiny feet never seem to tire.',
    rarityTier: RarityTier.COMMON,
    baseStats: {
      health: 25,
      attack: 15,
      defense: 10,
      special: 5,
    },
    abilities: [
      {
        id: 'quick_step',
        name: 'Quick Step',
        description: 'Increases movement speed slightly',
        effect: 'speed_boost_small',
      },
    ],
    evolutionSprites: ['stepfoot_1.png', 'stepfoot_2.png', 'stepfoot_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },
  {
    id: 'common_002',
    name: 'Walkwing',
    description: 'A bird-like creature with strong legs. It prefers walking to flying.',
    rarityTier: RarityTier.COMMON,
    baseStats: {
      health: 20,
      attack: 18,
      defense: 8,
      special: 9,
    },
    abilities: [
      {
        id: 'ground_peck',
        name: 'Ground Peck',
        description: 'A precise ground-based attack',
        effect: 'accuracy_boost',
      },
    ],
    evolutionSprites: ['walkwing_1.png', 'walkwing_2.png', 'walkwing_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },
  {
    id: 'common_003',
    name: 'Pacepal',
    description: 'A friendly companion that matches your walking pace perfectly.',
    rarityTier: RarityTier.COMMON,
    baseStats: {
      health: 30,
      attack: 12,
      defense: 12,
      special: 6,
    },
    abilities: [
      {
        id: 'steady_pace',
        name: 'Steady Pace',
        description: 'Maintains consistent performance',
        effect: 'stamina_boost',
      },
    ],
    evolutionSprites: ['pacepal_1.png', 'pacepal_2.png', 'pacepal_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },

  // Uncommon Tier (Tier 2)
  {
    id: 'uncommon_001',
    name: 'Stridehorn',
    description: 'A majestic creature with powerful legs and a spiraled horn. Known for its graceful gait.',
    rarityTier: RarityTier.UNCOMMON,
    baseStats: {
      health: 45,
      attack: 35,
      defense: 25,
      special: 15,
    },
    abilities: [
      {
        id: 'horn_charge',
        name: 'Horn Charge',
        description: 'A powerful charging attack',
        effect: 'damage_boost_medium',
      },
      {
        id: 'graceful_stride',
        name: 'Graceful Stride',
        description: 'Elegant movement that boosts evasion',
        effect: 'evasion_boost',
      },
    ],
    evolutionSprites: ['stridehorn_1.png', 'stridehorn_2.png', 'stridehorn_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },
  {
    id: 'uncommon_002',
    name: 'Joggerfly',
    description: 'A mystical insect that hovers while jogging in place. Its wings shimmer with each step.',
    rarityTier: RarityTier.UNCOMMON,
    baseStats: {
      health: 40,
      attack: 30,
      defense: 20,
      special: 30,
    },
    abilities: [
      {
        id: 'hover_jog',
        name: 'Hover Jog',
        description: 'Maintains position while building energy',
        effect: 'energy_accumulation',
      },
      {
        id: 'wing_gust',
        name: 'Wing Gust',
        description: 'Creates powerful wind attacks',
        effect: 'special_attack_boost',
      },
    ],
    evolutionSprites: ['joggerfly_1.png', 'joggerfly_2.png', 'joggerfly_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },

  // Rare Tier (Tier 3)
  {
    id: 'rare_001',
    name: 'Marathonmane',
    description: 'A legendary endurance runner with a flowing mane that ripples with each stride. Said to never tire.',
    rarityTier: RarityTier.RARE,
    baseStats: {
      health: 80,
      attack: 60,
      defense: 50,
      special: 40,
    },
    abilities: [
      {
        id: 'endless_endurance',
        name: 'Endless Endurance',
        description: 'Never loses stamina during long battles',
        effect: 'stamina_infinite',
      },
      {
        id: 'mane_whip',
        name: 'Mane Whip',
        description: 'Uses flowing mane as a powerful weapon',
        effect: 'damage_boost_large',
      },
      {
        id: 'runner_focus',
        name: 'Runner Focus',
        description: 'Intense concentration boosts all abilities',
        effect: 'all_stats_boost',
      },
    ],
    evolutionSprites: ['marathonmane_1.png', 'marathonmane_2.png', 'marathonmane_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },
  {
    id: 'rare_002',
    name: 'Speedshadow',
    description: 'A mysterious creature that moves so fast it appears as a shadow. Only the most dedicated walkers encounter it.',
    rarityTier: RarityTier.RARE,
    baseStats: {
      health: 70,
      attack: 75,
      defense: 40,
      special: 55,
    },
    abilities: [
      {
        id: 'shadow_dash',
        name: 'Shadow Dash',
        description: 'Moves at incredible speed, becoming untouchable',
        effect: 'evasion_perfect',
      },
      {
        id: 'speed_strike',
        name: 'Speed Strike',
        description: 'Lightning-fast attacks that hit multiple times',
        effect: 'multi_hit_attack',
      },
      {
        id: 'blur_form',
        name: 'Blur Form',
        description: 'Becomes partially incorporeal',
        effect: 'defense_phase',
      },
    ],
    evolutionSprites: ['speedshadow_1.png', 'speedshadow_2.png', 'speedshadow_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },

  // Epic Tier (Tier 4)
  {
    id: 'epic_001',
    name: 'Titanstrider',
    description: 'A colossal being whose every step shakes the earth. Ancient legends speak of its incredible journeys across continents.',
    rarityTier: RarityTier.EPIC,
    baseStats: {
      health: 150,
      attack: 120,
      defense: 100,
      special: 80,
    },
    abilities: [
      {
        id: 'earth_shake',
        name: 'Earth Shake',
        description: 'Each step creates seismic waves',
        effect: 'area_damage_massive',
      },
      {
        id: 'titan_strength',
        name: 'Titan Strength',
        description: 'Overwhelming physical power',
        effect: 'attack_boost_massive',
      },
      {
        id: 'continental_stride',
        name: 'Continental Stride',
        description: 'Can cross vast distances in single steps',
        effect: 'movement_teleport',
      },
      {
        id: 'ancient_wisdom',
        name: 'Ancient Wisdom',
        description: 'Knowledge accumulated over millennia',
        effect: 'special_boost_massive',
      },
    ],
    evolutionSprites: ['titanstrider_1.png', 'titanstrider_2.png', 'titanstrider_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },

  // Legendary Tier (Tier 5)
  {
    id: 'legendary_001',
    name: 'Stepmaster Supreme',
    description: 'The ultimate walking companion, said to be the first creature to ever take a step. Its presence inspires all other step-based creatures.',
    rarityTier: RarityTier.LEGENDARY,
    baseStats: {
      health: 250,
      attack: 200,
      defense: 180,
      special: 150,
    },
    abilities: [
      {
        id: 'first_step',
        name: 'First Step',
        description: 'The original step that started all movement',
        effect: 'reality_alter_movement',
      },
      {
        id: 'step_mastery',
        name: 'Step Mastery',
        description: 'Perfect control over all forms of locomotion',
        effect: 'all_abilities_enhance',
      },
      {
        id: 'inspire_walkers',
        name: 'Inspire Walkers',
        description: 'Motivates all creatures to reach their potential',
        effect: 'team_boost_ultimate',
      },
      {
        id: 'eternal_journey',
        name: 'Eternal Journey',
        description: 'Represents the endless nature of exploration',
        effect: 'immortality_walking',
      },
      {
        id: 'step_dimension',
        name: 'Step Dimension',
        description: 'Can access parallel walking dimensions',
        effect: 'dimension_control',
      },
    ],
    evolutionSprites: ['stepmaster_1.png', 'stepmaster_2.png', 'stepmaster_3.png'],
    discoveryCount: 0,
    isDiscovered: false,
  },
];

class SpeciesServiceImpl {
  private speciesDatabase: Species[] = [];
  private discoveryData: Map<string, SpeciesDiscoveryData> = new Map();
  private playerDiscoveries: Set<string> = new Set();

  async initializeSpeciesDatabase(): Promise<void> {
    try {
      // Load existing species database
      const existingData = await AsyncStorage.getItem(STORAGE_KEYS.SPECIES_DATABASE);
      if (existingData) {
        this.speciesDatabase = JSON.parse(existingData);
      } else {
        // Initialize with default species
        this.speciesDatabase = [...INITIAL_SPECIES_DATA];
        await this.saveSpeciesDatabase();
      }

      // Load discovery data
      const discoveryDataStr = await AsyncStorage.getItem(STORAGE_KEYS.DISCOVERY_DATA);
      if (discoveryDataStr) {
        const discoveryArray = JSON.parse(discoveryDataStr);
        this.discoveryData = new Map(discoveryArray.map((item: any) => [
          item.speciesId,
          {
            ...item,
            lastDiscoveryDate: new Date(item.lastDiscoveryDate),
          }
        ]));
      } else {
        // Initialize discovery data for all species
        this.initializeDiscoveryData();
      }

      // Load player discoveries
      const playerDiscoveriesStr = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_DISCOVERIES);
      if (playerDiscoveriesStr) {
        this.playerDiscoveries = new Set(JSON.parse(playerDiscoveriesStr));
      }

      console.log(`✅ Species database initialized with ${this.speciesDatabase.length} species`);
    } catch (error) {
      console.error('Error initializing species database:', error);
      throw new Error('Failed to initialize species database');
    }
  }

  private initializeDiscoveryData(): void {
    this.speciesDatabase.forEach(species => {
      this.discoveryData.set(species.id, {
        speciesId: species.id,
        globalDiscoveryCount: 0,
        lastDiscoveryDate: new Date(),
        discoveryMultiplier: 1.0,
        isActive: true,
      });
    });
    this.saveDiscoveryData();
  }

  async getSpeciesByRarity(rarity: RarityTier): Promise<Species[]> {
    return this.speciesDatabase.filter(species => 
      species.rarityTier === rarity && 
      this.discoveryData.get(species.id)?.isActive
    );
  }

  async getDiscoveredSpecies(): Promise<Species[]> {
    return this.speciesDatabase.filter(species => 
      this.playerDiscoveries.has(species.id)
    );
  }

  async getUndiscoveredSpecies(): Promise<Species[]> {
    return this.speciesDatabase.filter(species => 
      !this.playerDiscoveries.has(species.id) && 
      this.discoveryData.get(species.id)?.isActive
    );
  }

  async getSpeciesById(speciesId: string): Promise<Species | null> {
    return this.speciesDatabase.find(species => species.id === speciesId) || null;
  }

  async getAllSpecies(): Promise<Species[]> {
    return [...this.speciesDatabase];
  }

  async getPlayerDiscoveryCount(): Promise<number> {
    return this.playerDiscoveries.size;
  }

  async getDiscoveryCountByRarity(rarity: RarityTier): Promise<number> {
    const discoveredInTier = this.speciesDatabase.filter(species => 
      species.rarityTier === rarity && this.playerDiscoveries.has(species.id)
    );
    return discoveredInTier.length;
  }

  async getMaxFusionLevel(rarity: RarityTier): Promise<number> {
    const discoveredCount = await this.getDiscoveryCountByRarity(rarity);
    return discoveredCount * SPECIES_CONSTANTS.FUSION_LEVEL_MULTIPLIER;
  }

  async markSpeciesDiscovered(speciesId: string): Promise<void> {
    this.playerDiscoveries.add(speciesId);
    
    // Update global discovery count
    const discoveryData = this.discoveryData.get(speciesId);
    if (discoveryData) {
      discoveryData.globalDiscoveryCount += 1;
      discoveryData.lastDiscoveryDate = new Date();
    }

    // Update species discovery flag
    const species = this.speciesDatabase.find(s => s.id === speciesId);
    if (species) {
      species.isDiscovered = true;
      species.discoveryCount += 1;
    }

    await this.savePlayerDiscoveries();
    await this.saveDiscoveryData();
    await this.saveSpeciesDatabase();
  }

  getSpeciesConstants() {
    return SPECIES_CONSTANTS;
  }

  async getDiscoveryData(speciesId: string): Promise<SpeciesDiscoveryData | null> {
    return this.discoveryData.get(speciesId) || null;
  }

  async updateDiscoveryMultiplier(speciesId: string, multiplier: number): Promise<void> {
    const discoveryData = this.discoveryData.get(speciesId);
    if (discoveryData) {
      discoveryData.discoveryMultiplier = Math.max(
        SPECIES_CONSTANTS.DYNAMIC_BALANCING_MIN,
        Math.min(SPECIES_CONSTANTS.DYNAMIC_BALANCING_MAX, multiplier)
      );
      await this.saveDiscoveryData();
    }
  }

  private async saveSpeciesDatabase(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SPECIES_DATABASE, JSON.stringify(this.speciesDatabase));
    } catch (error) {
      console.error('Error saving species database:', error);
    }
  }

  private async saveDiscoveryData(): Promise<void> {
    try {
      const discoveryArray = Array.from(this.discoveryData.values());
      await AsyncStorage.setItem(STORAGE_KEYS.DISCOVERY_DATA, JSON.stringify(discoveryArray));
    } catch (error) {
      console.error('Error saving discovery data:', error);
    }
  }

  private async savePlayerDiscoveries(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_DISCOVERIES, JSON.stringify(Array.from(this.playerDiscoveries)));
    } catch (error) {
      console.error('Error saving player discoveries:', error);
    }
  }

  // Method to add new species (for expansion system)
  async addSpecies(species: Species): Promise<void> {
    this.speciesDatabase.push(species);
    
    // Initialize discovery data for new species
    this.discoveryData.set(species.id, {
      speciesId: species.id,
      globalDiscoveryCount: 0,
      lastDiscoveryDate: new Date(),
      discoveryMultiplier: SPECIES_CONSTANTS.DYNAMIC_BALANCING_MAX, // New species get max multiplier
      isActive: true,
    });

    await this.saveSpeciesDatabase();
    await this.saveDiscoveryData();
  }

  // Method to get species statistics for balancing
  async getSpeciesStatistics(): Promise<{
    totalSpecies: number;
    speciesByRarity: Record<RarityTier, number>;
    discoveredByRarity: Record<RarityTier, number>;
    averageDiscoveryCount: number;
  }> {
    const speciesByRarity = {
      [RarityTier.COMMON]: 0,
      [RarityTier.UNCOMMON]: 0,
      [RarityTier.RARE]: 0,
      [RarityTier.EPIC]: 0,
      [RarityTier.LEGENDARY]: 0,
    };

    const discoveredByRarity = {
      [RarityTier.COMMON]: 0,
      [RarityTier.UNCOMMON]: 0,
      [RarityTier.RARE]: 0,
      [RarityTier.EPIC]: 0,
      [RarityTier.LEGENDARY]: 0,
    };

    let totalDiscoveryCount = 0;

    this.speciesDatabase.forEach(species => {
      speciesByRarity[species.rarityTier]++;
      if (this.playerDiscoveries.has(species.id)) {
        discoveredByRarity[species.rarityTier]++;
      }
      totalDiscoveryCount += species.discoveryCount;
    });

    return {
      totalSpecies: this.speciesDatabase.length,
      speciesByRarity,
      discoveredByRarity,
      averageDiscoveryCount: totalDiscoveryCount / this.speciesDatabase.length,
    };
  }
}

export const speciesService = new SpeciesServiceImpl();
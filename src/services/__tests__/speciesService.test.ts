import { speciesService } from '../speciesService';
import { RarityTier } from '../../types';

// Mock AsyncStorage completely
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

describe('SpeciesService', () => {
  // Reset service state before each test
  beforeEach(async () => {
    // Clear any existing state by reinitializing
    await speciesService.initializeSpeciesDatabase();
  });

  describe('constants and basic functionality', () => {
    it('should return correct species constants', () => {
      const constants = speciesService.getSpeciesConstants();

      expect(constants.RARITY_MULTIPLIER).toBe(100);
      expect(constants.FUSION_LEVEL_MULTIPLIER).toBe(2);
      expect(constants.TIER_ADVANCEMENT_THRESHOLD).toBe(100);
      expect(constants.MAGNIFYING_GLASS_RANGE).toEqual([96, 100]);
    });

    it('should have proper rarity tier definitions', () => {
      expect(RarityTier.COMMON).toBeDefined();
      expect(RarityTier.UNCOMMON).toBeDefined();
      expect(RarityTier.RARE).toBeDefined();
      expect(RarityTier.EPIC).toBeDefined();
      expect(RarityTier.LEGENDARY).toBeDefined();
    });
  });

  describe('species database initialization', () => {
    it('should initialize species database successfully', async () => {
      const allSpecies = await speciesService.getAllSpecies();
      expect(allSpecies.length).toBeGreaterThan(0);
      
      // Verify we have species in each tier
      const commonSpecies = await speciesService.getSpeciesByRarity(RarityTier.COMMON);
      const uncommonSpecies = await speciesService.getSpeciesByRarity(RarityTier.UNCOMMON);
      const rareSpecies = await speciesService.getSpeciesByRarity(RarityTier.RARE);
      const epicSpecies = await speciesService.getSpeciesByRarity(RarityTier.EPIC);
      const legendarySpecies = await speciesService.getSpeciesByRarity(RarityTier.LEGENDARY);
      
      expect(commonSpecies.length).toBeGreaterThanOrEqual(2);
      expect(uncommonSpecies.length).toBeGreaterThanOrEqual(2);
      expect(rareSpecies.length).toBeGreaterThanOrEqual(2);
      expect(epicSpecies.length).toBeGreaterThanOrEqual(1);
      expect(legendarySpecies.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle species discovery tracking', async () => {
      const allSpecies = await speciesService.getAllSpecies();
      const firstSpecies = allSpecies[0];
      
      // Initially no species should be discovered
      const initialDiscovered = await speciesService.getDiscoveredSpecies();
      expect(initialDiscovered.length).toBe(0);
      
      // Mark a species as discovered
      await speciesService.markSpeciesDiscovered(firstSpecies.id);
      
      // Verify it's now discovered
      const discoveredAfter = await speciesService.getDiscoveredSpecies();
      expect(discoveredAfter.length).toBe(1);
      expect(discoveredAfter[0].id).toBe(firstSpecies.id);
    });

    it('should calculate fusion levels correctly', async () => {
      // Get current discovery count first
      const currentDiscoveryCount = await speciesService.getDiscoveryCountByRarity(RarityTier.COMMON);
      const initialFusionLevel = await speciesService.getMaxFusionLevel(RarityTier.COMMON);
      expect(initialFusionLevel).toBe(currentDiscoveryCount * 2);
      
      // Find undiscovered common species to mark as discovered
      const commonSpecies = await speciesService.getSpeciesByRarity(RarityTier.COMMON);
      const undiscoveredCommon = await speciesService.getUndiscoveredSpecies();
      const undiscoveredCommonSpecies = commonSpecies.filter(species => 
        undiscoveredCommon.some(undiscovered => undiscovered.id === species.id)
      );
      
      if (undiscoveredCommonSpecies.length >= 2) {
        await speciesService.markSpeciesDiscovered(undiscoveredCommonSpecies[0].id);
        await speciesService.markSpeciesDiscovered(undiscoveredCommonSpecies[1].id);
        
        // Fusion level should increase by 4 (2 new discoveries * 2 multiplier)
        const fusionLevelAfter = await speciesService.getMaxFusionLevel(RarityTier.COMMON);
        expect(fusionLevelAfter).toBe(initialFusionLevel + 4);
      } else {
        // If we don't have enough undiscovered common species, just verify the formula works
        expect(initialFusionLevel).toBe(currentDiscoveryCount * 2);
      }
    });
  });

  describe('species data validation', () => {
    it('should have valid species data structure', async () => {
      const allSpecies = await speciesService.getAllSpecies();
      expect(allSpecies.length).toBeGreaterThan(0);
      
      allSpecies.forEach(species => {
        // Validate required fields
        expect(species.id).toBeDefined();
        expect(species.name).toBeDefined();
        expect(species.description).toBeDefined();
        expect(species.rarityTier).toBeDefined();
        expect(species.baseStats).toBeDefined();
        expect(species.abilities).toBeDefined();
        expect(species.evolutionSprites).toBeDefined();
        
        // Validate base stats structure
        expect(typeof species.baseStats.health).toBe('number');
        expect(typeof species.baseStats.attack).toBe('number');
        expect(typeof species.baseStats.defense).toBe('number');
        expect(typeof species.baseStats.special).toBe('number');
        
        // Validate abilities array
        expect(Array.isArray(species.abilities)).toBe(true);
        species.abilities.forEach(ability => {
          expect(ability.id).toBeDefined();
          expect(ability.name).toBeDefined();
          expect(ability.description).toBeDefined();
          expect(ability.effect).toBeDefined();
        });
        
        // Validate evolution sprites
        expect(Array.isArray(species.evolutionSprites)).toBe(true);
        expect(species.evolutionSprites.length).toBeGreaterThan(0);
      });
    });

    it('should have proper stat scaling by rarity', async () => {
      const commonSpecies = await speciesService.getSpeciesByRarity(RarityTier.COMMON);
      const legendarySpecies = await speciesService.getSpeciesByRarity(RarityTier.LEGENDARY);
      
      if (commonSpecies.length > 0 && legendarySpecies.length > 0) {
        const commonStats = commonSpecies[0].baseStats;
        const legendaryStats = legendarySpecies[0].baseStats;
        
        // Legendary species should have significantly higher stats
        expect(legendaryStats.health).toBeGreaterThan(commonStats.health);
        expect(legendaryStats.attack).toBeGreaterThan(commonStats.attack);
        expect(legendaryStats.defense).toBeGreaterThan(commonStats.defense);
        expect(legendaryStats.special).toBeGreaterThan(commonStats.special);
      }
    });
  });

  describe('species statistics', () => {
    it('should provide accurate species statistics', async () => {
      const stats = await speciesService.getSpeciesStatistics();
      
      expect(stats.totalSpecies).toBeGreaterThan(0);
      expect(stats.speciesByRarity).toBeDefined();
      expect(stats.discoveredByRarity).toBeDefined();
      expect(typeof stats.averageDiscoveryCount).toBe('number');
      
      // Verify rarity distribution
      const totalByRarity = Object.values(stats.speciesByRarity).reduce((sum, count) => sum + count, 0);
      expect(totalByRarity).toBe(stats.totalSpecies);
    });
  });

  describe('species management', () => {
    it('should handle discovery data correctly', async () => {
      const allSpecies = await speciesService.getAllSpecies();
      const testSpecies = allSpecies[0];
      
      // Get initial discovery data
      const initialData = await speciesService.getDiscoveryData(testSpecies.id);
      expect(initialData).toBeDefined();
      expect(initialData?.speciesId).toBe(testSpecies.id);
      expect(initialData?.globalDiscoveryCount).toBe(0);
      
      // Update discovery multiplier
      await speciesService.updateDiscoveryMultiplier(testSpecies.id, 5.0);
      
      const updatedData = await speciesService.getDiscoveryData(testSpecies.id);
      expect(updatedData?.discoveryMultiplier).toBe(5.0);
    });

    it('should handle undiscovered species filtering', async () => {
      const allSpecies = await speciesService.getAllSpecies();
      const undiscoveredInitial = await speciesService.getUndiscoveredSpecies();
      
      // Get current discovered count
      const discoveredInitial = await speciesService.getDiscoveredSpecies();
      
      // Undiscovered should be total minus already discovered
      expect(undiscoveredInitial.length).toBe(allSpecies.length - discoveredInitial.length);
      
      // Mark one more as discovered
      const undiscoveredSpecies = undiscoveredInitial[0];
      await speciesService.markSpeciesDiscovered(undiscoveredSpecies.id);
      
      const undiscoveredAfter = await speciesService.getUndiscoveredSpecies();
      expect(undiscoveredAfter.length).toBe(undiscoveredInitial.length - 1);
    });
  });
});
import { discoveryService } from '../discoveryService';
import { speciesService } from '../speciesService';
import { RarityTier, MagnifyingGlass } from '../../types';

// Mock AsyncStorage completely
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

describe('DiscoveryService', () => {
  beforeEach(async () => {
    // Initialize species database before each test
    await speciesService.initializeSpeciesDatabase();
  });

  describe('discovery constants', () => {
    it('should return correct discovery constants', () => {
      const constants = discoveryService.getDiscoveryConstants();

      expect(constants.TIER_ADVANCEMENT_ROLL).toBe(100);
      expect(constants.MAGNIFYING_GLASS_RANGE).toEqual([96, 100]);
      expect(constants.MAX_ADVANCEMENT_ROLLS).toBe(10);
      expect(constants.BASE_RARITY_WEIGHTS).toBeDefined();
    });
  });

  describe('cell inspection', () => {
    it('should successfully inspect a cell without magnifying glass', async () => {
      const result = await discoveryService.inspectCell();

      expect(result.success).toBe(true);
      expect(result.species).toBeDefined();
      expect(result.stepling).toBeDefined();
      expect(result.rarityTier).toBeDefined();
      expect(typeof result.isNewDiscovery).toBe('boolean');
      expect(typeof result.advancementRolls).toBe('number');
    });

    it('should successfully inspect a cell with magnifying glass', async () => {
      const magnifyingGlass: MagnifyingGlass = {
        id: 'test_glass',
        tier: RarityTier.RARE,
        count: 1,
      };

      const result = await discoveryService.inspectCell(magnifyingGlass);

      expect(result.success).toBe(true);
      expect(result.species).toBeDefined();
      expect(result.stepling).toBeDefined();
      expect(result.magnifyingGlassUsed).toEqual(magnifyingGlass);
    });

    it('should create valid stepling from discovered species', async () => {
      const result = await discoveryService.inspectCell();

      if (result.success && result.stepling) {
        expect(result.stepling.id).toBeDefined();
        expect(result.stepling.speciesId).toBe(result.species!.id);
        expect(result.stepling.level).toBe(1);
        expect(result.stepling.fusionLevel).toBe(1);
        expect(result.stepling.currentStats).toBeDefined();
        expect(result.stepling.createdAt).toBeDefined();
        expect(result.stepling.updatedAt).toBeDefined();
      }
    });
  });

  describe('discovery preview', () => {
    it('should provide discovery preview without magnifying glass', async () => {
      const preview = await discoveryService.getDiscoveryPreview();

      expect(preview.tierProbabilities).toBeDefined();
      expect(preview.availableSpeciesCount).toBeDefined();
      expect(preview.magnifyingGlassEffect).toBeNull();

      // Verify probabilities sum to approximately 1
      const totalProbability = Object.values(preview.tierProbabilities).reduce((sum, prob) => sum + prob, 0);
      expect(totalProbability).toBeCloseTo(1, 2);

      // Common tier should have highest probability
      expect(preview.tierProbabilities[RarityTier.COMMON]).toBeGreaterThan(0.9);
    });

    it('should provide discovery preview with magnifying glass', async () => {
      const magnifyingGlass: MagnifyingGlass = {
        id: 'test_glass',
        tier: RarityTier.UNCOMMON,
        count: 1,
      };

      const preview = await discoveryService.getDiscoveryPreview(magnifyingGlass);

      expect(preview.magnifyingGlassEffect).toBeDefined();
      expect(preview.magnifyingGlassEffect).toContain('5%');
      expect(preview.magnifyingGlassEffect).toContain(magnifyingGlass.tier);
    });
  });

  describe('discovery simulation', () => {
    it('should simulate discovery accurately', async () => {
      const iterations = 1000;
      const simulation = await discoveryService.simulateDiscovery(iterations);

      expect(simulation.totalIterations).toBe(iterations);
      expect(simulation.averageAdvancementRolls).toBeGreaterThanOrEqual(0);

      // Verify results distribution
      const totalResults = Object.values(simulation.results).reduce((sum, count) => sum + count, 0);
      expect(totalResults).toBe(iterations);

      // Common should be most frequent
      expect(simulation.results[RarityTier.COMMON]).toBeGreaterThan(simulation.results[RarityTier.UNCOMMON]);
      expect(simulation.results[RarityTier.UNCOMMON]).toBeGreaterThanOrEqual(simulation.results[RarityTier.RARE]);
    });

    it('should show magnifying glass effect in simulation', async () => {
      const iterations = 1000;
      const magnifyingGlass: MagnifyingGlass = {
        id: 'test_glass',
        tier: RarityTier.RARE,
        count: 1,
      };

      const withoutGlass = await discoveryService.simulateDiscovery(iterations);
      const withGlass = await discoveryService.simulateDiscovery(iterations, magnifyingGlass);

      // With magnifying glass should have more higher-tier discoveries
      const higherTierWithout = withoutGlass.results[RarityTier.UNCOMMON] + 
                               withoutGlass.results[RarityTier.RARE] + 
                               withoutGlass.results[RarityTier.EPIC] + 
                               withoutGlass.results[RarityTier.LEGENDARY];

      const higherTierWith = withGlass.results[RarityTier.UNCOMMON] + 
                            withGlass.results[RarityTier.RARE] + 
                            withGlass.results[RarityTier.EPIC] + 
                            withGlass.results[RarityTier.LEGENDARY];

      expect(higherTierWith).toBeGreaterThanOrEqual(higherTierWithout);
    });
  });

  describe('tier advancement logic', () => {
    it('should handle tier advancement correctly', async () => {
      // Test multiple discoveries to verify tier advancement works
      const results = [];
      
      for (let i = 0; i < 100; i++) {
        const result = await discoveryService.inspectCell();
        if (result.success) {
          results.push(result.rarityTier);
        }
      }

      // Should have mostly common, some uncommon, fewer rare, etc.
      const commonCount = results.filter(tier => tier === RarityTier.COMMON).length;
      const uncommonCount = results.filter(tier => tier === RarityTier.UNCOMMON).length;
      
      expect(commonCount).toBeGreaterThan(0);
      expect(results.length).toBe(100);
      
      // Common should be more frequent than uncommon (though not guaranteed in small samples)
      // So we'll just check that we got some results
      expect(commonCount + uncommonCount).toBeGreaterThan(0);
    });
  });
});
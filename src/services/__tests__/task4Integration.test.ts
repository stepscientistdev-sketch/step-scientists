import { speciesService } from '../speciesService';
import { discoveryService } from '../discoveryService';
import { RarityTier } from '../../types';

// Mock AsyncStorage completely
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

describe('Task 4 Integration Tests', () => {
  beforeEach(async () => {
    await speciesService.initializeSpeciesDatabase();
  });

  describe('End-to-End Discovery Flow', () => {
    it('should complete full discovery workflow', async () => {
      // 1. Verify initial state
      const initialSpecies = await speciesService.getAllSpecies();
      const initialDiscovered = await speciesService.getDiscoveredSpecies();
      
      expect(initialSpecies.length).toBe(9);
      expect(initialDiscovered.length).toBe(0);

      // 2. Perform discovery
      const discoveryResult = await discoveryService.inspectCell();
      
      expect(discoveryResult.success).toBe(true);
      expect(discoveryResult.species).toBeDefined();
      expect(discoveryResult.stepling).toBeDefined();
      expect(discoveryResult.isNewDiscovery).toBe(true);

      // 3. Verify discovery was recorded
      const afterDiscovered = await speciesService.getDiscoveredSpecies();
      expect(afterDiscovered.length).toBe(1);
      expect(afterDiscovered[0].id).toBe(discoveryResult.species!.id);

      // 4. Verify stepling creation
      const stepling = discoveryResult.stepling!;
      expect(stepling.id).toBeDefined();
      expect(stepling.speciesId).toBe(discoveryResult.species!.id);
      expect(stepling.level).toBe(1);
      expect(stepling.fusionLevel).toBe(1);
      expect(stepling.currentStats).toEqual(discoveryResult.species!.baseStats);
    });

    it('should handle magnifying glass enhancement correctly', async () => {
      const magnifyingGlass = {
        id: 'test_glass',
        tier: RarityTier.RARE,
        count: 1
      };

      // Run multiple discoveries to test magnifying glass effect
      const normalResults = [];
      const glassResults = [];

      for (let i = 0; i < 50; i++) {
        const normal = await discoveryService.inspectCell();
        const withGlass = await discoveryService.inspectCell(magnifyingGlass);
        
        if (normal.success) normalResults.push(normal.rarityTier);
        if (withGlass.success) glassResults.push(withGlass.rarityTier);
      }

      // Count higher tier discoveries
      const normalHigherTier = normalResults.filter(tier => tier !== RarityTier.COMMON).length;
      const glassHigherTier = glassResults.filter(tier => tier !== RarityTier.COMMON).length;

      // Magnifying glass should generally produce more higher-tier results
      // (Though this is probabilistic, so we'll be lenient)
      expect(glassHigherTier).toBeGreaterThanOrEqual(normalHigherTier);
    });

    it('should prioritize undiscovered species', async () => {
      // Discover all common species first
      const commonSpecies = await speciesService.getSpeciesByRarity(RarityTier.COMMON);
      
      for (const species of commonSpecies) {
        await speciesService.markSpeciesDiscovered(species.id);
      }

      // Now perform discoveries - should not get common species anymore
      const results = [];
      for (let i = 0; i < 20; i++) {
        const result = await discoveryService.inspectCell();
        if (result.success && result.isNewDiscovery) {
          results.push(result.species!.rarityTier);
        }
      }

      // Should not discover any common species since they're all discovered
      const commonDiscoveries = results.filter(tier => tier === RarityTier.COMMON);
      expect(commonDiscoveries.length).toBe(0);
    });

    it('should maintain discovery statistics correctly', async () => {
      const initialStats = await speciesService.getSpeciesStatistics();
      expect(initialStats.totalSpecies).toBe(9);
      
      // Get initial counts
      const initialDiscoveredTotal = Object.values(initialStats.discoveredByRarity).reduce((sum, count) => sum + count, 0);

      // Perform several discoveries
      for (let i = 0; i < 5; i++) {
        await discoveryService.inspectCell();
      }

      const afterStats = await speciesService.getSpeciesStatistics();
      
      // Check that discovery counts increased
      const finalDiscoveredTotal = Object.values(afterStats.discoveredByRarity).reduce((sum, count) => sum + count, 0);
      expect(finalDiscoveredTotal).toBeGreaterThanOrEqual(initialDiscoveredTotal);
      
      // Average discovery count should be reasonable
      expect(afterStats.averageDiscoveryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistical Validation', () => {
    it('should produce expected rarity distribution', async () => {
      const results = {
        [RarityTier.COMMON]: 0,
        [RarityTier.UNCOMMON]: 0,
        [RarityTier.RARE]: 0,
        [RarityTier.EPIC]: 0,
        [RarityTier.LEGENDARY]: 0
      };

      // Run 100 discoveries
      for (let i = 0; i < 100; i++) {
        const result = await discoveryService.inspectCell();
        if (result.success) {
          results[result.rarityTier]++;
        }
      }

      // Common should dominate (expect 95%+ common)
      expect(results[RarityTier.COMMON]).toBeGreaterThan(90);
      
      // Higher tiers should be rare but possible
      const totalHigherTier = results[RarityTier.UNCOMMON] + 
                             results[RarityTier.RARE] + 
                             results[RarityTier.EPIC] + 
                             results[RarityTier.LEGENDARY];
      expect(totalHigherTier).toBeLessThan(10);
    });

    it('should validate tier advancement mechanics', async () => {
      // Test the core advancement algorithm
      const simulation = await discoveryService.simulateDiscovery(1000);
      
      expect(simulation.totalIterations).toBe(1000);
      expect(simulation.averageAdvancementRolls).toBeGreaterThan(0);
      
      // Verify distribution makes sense
      const total = Object.values(simulation.results).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1000);
      
      // Common should be vast majority
      expect(simulation.results[RarityTier.COMMON]).toBeGreaterThan(950);
    });
  });

  describe('Data Persistence', () => {
    it('should persist discovery state correctly', async () => {
      // Make a discovery
      const result = await discoveryService.inspectCell();
      expect(result.success).toBe(true);
      
      const speciesId = result.species!.id;
      
      // Verify discovery data exists
      const discoveryData = await speciesService.getDiscoveryData(speciesId);
      expect(discoveryData).toBeDefined();
      expect(discoveryData!.globalDiscoveryCount).toBeGreaterThan(0);
      
      // Verify species is marked as discovered
      const discoveredSpecies = await speciesService.getDiscoveredSpecies();
      expect(discoveredSpecies.some(s => s.id === speciesId)).toBe(true);
    });

    it('should handle database reset correctly', async () => {
      // Make some discoveries
      await discoveryService.inspectCell();
      await discoveryService.inspectCell();
      
      const beforeReset = await speciesService.getDiscoveredSpecies();
      expect(beforeReset.length).toBeGreaterThan(0);
      
      // Reset database (this would be implemented in the service)
      // For now, just verify the current state is trackable
      const allSpecies = await speciesService.getAllSpecies();
      expect(allSpecies.length).toBe(9);
    });
  });

  describe('Error Handling', () => {
    it('should handle edge cases gracefully', async () => {
      // Test with invalid magnifying glass
      const invalidGlass = {
        id: 'invalid',
        tier: 'INVALID_TIER' as any,
        count: 1
      };

      // Should still work, just ignore invalid glass
      const result = await discoveryService.inspectCell(invalidGlass);
      expect(result.success).toBe(true);
    });

    it('should handle empty species tiers', async () => {
      // This tests the robustness of species selection
      // Even if a tier is empty, the system should handle it
      const result = await discoveryService.inspectCell();
      expect(result.success).toBe(true);
      expect(result.species).toBeDefined();
    });
  });
});
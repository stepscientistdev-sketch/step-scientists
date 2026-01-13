import { speciesService } from '../speciesService';
import { discoveryService } from '../discoveryService';

// Mock AsyncStorage completely
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

describe('Task 4 Issue Investigation', () => {
  it('should demonstrate the statistics issue', async () => {
    console.log('=== INVESTIGATING STATISTICS ISSUE ===');
    
    // Initialize fresh
    await speciesService.initializeSpeciesDatabase();
    
    // Check initial state
    const initialStats = await speciesService.getSpeciesStatistics();
    console.log('Initial averageDiscoveryCount:', initialStats.averageDiscoveryCount);
    console.log('Initial total discovered:', Object.values(initialStats.discoveredByRarity).reduce((sum, count) => sum + count, 0));
    
    // Check individual species discovery counts
    const allSpecies = await speciesService.getAllSpecies();
    console.log('Individual species discovery counts:');
    allSpecies.forEach(species => {
      console.log(`  ${species.name}: ${species.discoveryCount} discoveries`);
    });
    
    // Perform some discoveries
    console.log('\n=== PERFORMING 3 DISCOVERIES ===');
    for (let i = 0; i < 3; i++) {
      const result = await discoveryService.inspectCell();
      console.log(`Discovery ${i + 1}: ${result.species?.name} (${result.rarityTier}), isNew: ${result.isNewDiscovery}`);
    }
    
    // Check state after discoveries
    const afterStats = await speciesService.getSpeciesStatistics();
    console.log('\nAfter discoveries:');
    console.log('Final averageDiscoveryCount:', afterStats.averageDiscoveryCount);
    console.log('Final total discovered:', Object.values(afterStats.discoveredByRarity).reduce((sum, count) => sum + count, 0));
    
    // Check individual species discovery counts again
    const allSpeciesAfter = await speciesService.getAllSpecies();
    console.log('Individual species discovery counts after:');
    allSpeciesAfter.forEach(species => {
      console.log(`  ${species.name}: ${species.discoveryCount} discoveries`);
    });
    
    // The issue: averageDiscoveryCount should change if we're making new discoveries
    // But if the service maintains state between tests, it might not start from 0
    console.log('\n=== ANALYSIS ===');
    console.log('Expected behavior: averageDiscoveryCount should increase when we make discoveries');
    console.log('Actual behavior: May not change if service maintains state between tests');
    
    // This test will help us understand what's happening
    expect(afterStats.averageDiscoveryCount).toBeGreaterThanOrEqual(initialStats.averageDiscoveryCount);
  });

  it('should show the singleton state persistence issue', async () => {
    console.log('\n=== TESTING SINGLETON STATE PERSISTENCE ===');
    
    // Don't reinitialize - use existing state
    const stats = await speciesService.getSpeciesStatistics();
    console.log('Stats without reinitialization:', stats.averageDiscoveryCount);
    
    // This demonstrates that the service maintains state between tests
    // which is why our original test was failing
    expect(stats.averageDiscoveryCount).toBeGreaterThanOrEqual(0);
  });
});
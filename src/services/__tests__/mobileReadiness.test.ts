import { gameService } from '../gameService';
import { steplingService } from '../steplingService';
import { discoveryService } from '../discoveryService';
import { speciesService } from '../speciesService';
import { GameMode, RarityTier } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock apiClient
jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe('Mobile Readiness - Core Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    const { apiClient } = require('../apiClient');
    apiClient.get.mockResolvedValue({
      data: {
        id: 'species-1',
        name: 'Test Species',
        rarityTier: RarityTier.COMMON,
        baseStats: { health: 100, attack: 50, defense: 40, special: 30 },
        abilities: [],
        evolutionSprites: [],
        isDiscovered: true,
      }
    });
    apiClient.post.mockResolvedValue({ success: true });
    apiClient.put.mockResolvedValue({ success: true });
  });

  describe('Complete Game Flow', () => {
    it('should handle a complete discovery-to-training flow', async () => {
      // 1. Initialize game services
      await gameService.initializeGameData();
      await steplingService.initializeSteplings();
      
      // 2. Start in Discovery Mode
      await gameService.switchGameMode(GameMode.DISCOVERY);
      
      // 3. Simulate walking 1000 steps to earn 1 cell
      const discoveryResult = await gameService.updateStepsInMode(1000);
      expect(discoveryResult.resources.cells).toBe(1);
      
      // 4. Use the cell to discover a species
      const discoveryAttempt = await discoveryService.inspectCell('player-1');
      expect(discoveryAttempt.success).toBe(true);
      
      // 5. Switch to Training Mode
      await gameService.switchGameMode(GameMode.TRAINING);
      
      // 6. Set up training roster (assuming we have steplings)
      const mockSteplings = [
        {
          id: 'stepling-1',
          playerId: 'player-1',
          speciesId: 'species-1',
          level: 1,
          fusionLevel: 1,
          currentStats: { health: 100, attack: 50, defense: 40, special: 30 },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      
      (steplingService as any).steplings = mockSteplings;
      await steplingService.setTrainingRoster(['stepling-1']);
      
      // 7. Simulate walking 100 steps to earn 10 experience points
      const trainingResult = await gameService.updateStepsInMode(100);
      expect(trainingResult.resources.experiencePoints).toBe(10);
      expect(trainingResult.trainingResults).toBeDefined();
      
      // 8. Verify stepling leveled up
      expect(trainingResult.trainingResults!['stepling-1'].success).toBe(true);
      expect(trainingResult.trainingResults!['stepling-1'].updatedStepling!.level).toBe(2);
    });

    it('should handle milestone rewards correctly', async () => {
      // Reset game service state and mock AsyncStorage properly
      (gameService as any).currentModeData = null;
      (gameService as any).milestoneProgress = null;
      
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(null); // Start fresh
      AsyncStorage.setItem.mockResolvedValue(undefined);
      
      await gameService.initializeGameData();
      
      // Simulate reaching 5000 steps milestone
      await gameService.switchGameMode(GameMode.DISCOVERY);
      
      // Start from 0 steps and go to 5000 to trigger milestone
      const result = await gameService.updateStepsInMode(5000);
      
      // Check if milestone was triggered
      expect(result.newMilestones).toHaveLength(1);
      expect(result.newMilestones[0].tier).toBe(RarityTier.UNCOMMON);
    });

    it('should handle fusion mechanics properly', async () => {
      // Set up two steplings of same species and fusion level
      const stepling1 = {
        id: 'stepling-1',
        playerId: 'player-1',
        speciesId: 'species-1',
        level: 5,
        fusionLevel: 1,
        currentStats: { health: 150, attack: 75, defense: 60, special: 45 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const stepling2 = {
        id: 'stepling-2',
        playerId: 'player-1',
        speciesId: 'species-1',
        level: 3,
        fusionLevel: 1,
        currentStats: { health: 130, attack: 65, defense: 52, special: 39 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (steplingService as any).steplings = [stepling1, stepling2];
      
      // Attempt fusion
      const fusionResult = await steplingService.fuseSteplings('stepling-1', 'stepling-2', 10);
      
      expect(fusionResult.success).toBe(true);
      expect(fusionResult.newStepling!.fusionLevel).toBe(2);
      expect(fusionResult.newStepling!.level).toBe(1); // Starts at level 1
      
      // Verify fusion bonus was applied
      expect(fusionResult.newStepling!.currentStats.health).toBeGreaterThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const { apiClient } = require('../apiClient');
      apiClient.get.mockRejectedValue(new Error('Network error'));
      
      // Should not crash when API fails
      await expect(gameService.initializeGameData()).resolves.not.toThrow();
      await expect(steplingService.initializeSteplings()).resolves.not.toThrow();
    });

    it('should handle invalid step counts', async () => {
      await gameService.initializeGameData();
      
      // Negative steps should not break anything
      const result = await gameService.updateStepsInMode(-100);
      expect(result.resources.cells).toBe(0);
      expect(result.resources.experiencePoints).toBe(0);
    });

    it('should handle fusion with invalid steplings', async () => {
      (steplingService as any).steplings = [];
      
      const result = await steplingService.fuseSteplings('invalid-1', 'invalid-2', 10);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Data Persistence', () => {
    it('should save and restore game state', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      // Mock saved data
      AsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === 'game_mode_data') {
          return Promise.resolve(JSON.stringify({
            mode: GameMode.TRAINING,
            stepsInMode: 500,
            lastModeSwitch: new Date().toISOString(),
            totalStepsInDiscovery: 2000,
            totalStepsInTraining: 1500,
          }));
        }
        return Promise.resolve(null);
      });
      
      await gameService.initializeGameData();
      const modeData = gameService.getCurrentModeData();
      
      expect(modeData!.mode).toBe(GameMode.TRAINING);
      expect(modeData!.stepsInMode).toBe(500);
      expect(modeData!.totalStepsInTraining).toBe(1500);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large numbers of steplings efficiently', async () => {
      // Create 100 mock steplings
      const manySteplings = Array.from({ length: 100 }, (_, i) => ({
        id: `stepling-${i}`,
        playerId: 'player-1',
        speciesId: `species-${i % 10}`, // 10 different species
        level: Math.floor(Math.random() * 10) + 1,
        fusionLevel: 1,
        currentStats: { health: 100, attack: 50, defense: 40, special: 30 },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      
      (steplingService as any).steplings = manySteplings;
      
      const startTime = Date.now();
      const collection = await steplingService.getSteplingCollection();
      const endTime = Date.now();
      
      expect(collection.steplings).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});

describe('Mobile-Specific Considerations', () => {
  it('should handle app backgrounding gracefully', async () => {
    await gameService.initializeGameData();
    
    // Simulate app going to background and coming back
    const beforeBackground = gameService.getCurrentModeData();
    
    // Simulate some time passing (app in background)
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // App comes back to foreground
    await gameService.initializeGameData();
    const afterBackground = gameService.getCurrentModeData();
    
    expect(afterBackground).toBeDefined();
    expect(afterBackground!.mode).toBe(beforeBackground!.mode);
  });

  it('should handle network connectivity issues', async () => {
    const { apiClient } = require('../apiClient');
    
    // Simulate network timeout
    apiClient.get.mockRejectedValue({ code: 'ETIMEDOUT' });
    
    // Should continue working with cached data
    await expect(steplingService.initializeSteplings()).resolves.not.toThrow();
  });
});
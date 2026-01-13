import { gameService } from '../gameService';
import { steplingService } from '../steplingService';
import { GameMode, RarityTier, Stepling, Species } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock apiClient
jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe('Training System Integration', () => {
  const mockSpecies: Species = {
    id: 'species-1',
    name: 'Test Species',
    description: 'A test species',
    rarityTier: RarityTier.COMMON,
    baseStats: {
      health: 100,
      attack: 50,
      defense: 40,
      special: 30,
    },
    abilities: [],
    evolutionSprites: [],
    discoveryCount: 0,
    isDiscovered: true,
  };

  const mockStepling1: Stepling = {
    id: 'stepling-1',
    playerId: 'player-1',
    speciesId: 'species-1',
    level: 1,
    fusionLevel: 1,
    currentStats: {
      health: 100,
      attack: 50,
      defense: 40,
      special: 30,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStepling2: Stepling = {
    id: 'stepling-2',
    playerId: 'player-1',
    speciesId: 'species-1',
    level: 2,
    fusionLevel: 1,
    currentStats: {
      health: 110,
      attack: 55,
      defense: 44,
      special: 33,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset services
    (gameService as any).currentModeData = null;
    (gameService as any).milestoneProgress = null;
    (steplingService as any).steplings = [mockStepling1, mockStepling2];
    (steplingService as any).trainingRoster = ['stepling-1', 'stepling-2'];

    // Mock API responses
    const { apiClient } = require('../apiClient');
    apiClient.get.mockResolvedValue({ data: mockSpecies });
    apiClient.put.mockResolvedValue({ success: true });
  });

  describe('Training Mode Experience Distribution', () => {
    it('should distribute experience to training roster when in training mode', async () => {
      // Initialize game service in training mode
      await gameService.initializeGameData();
      await gameService.switchGameMode(GameMode.TRAINING);

      // Simulate 200 steps (should give 20 experience points)
      const result = await gameService.updateStepsInMode(200);

      expect(result.resources.experiencePoints).toBe(20);
      expect(result.trainingResults).toBeDefined();
      expect(Object.keys(result.trainingResults!)).toHaveLength(2);
      
      // Each stepling should get 10 experience points
      expect(result.trainingResults!['stepling-1'].success).toBe(true);
      // stepling-2 (level 2) needs 20 exp to level up, but only gets 10, so should fail
      expect(result.trainingResults!['stepling-2'].success).toBe(false);
    });

    it('should not distribute experience when in discovery mode', async () => {
      // Initialize game service in discovery mode
      await gameService.initializeGameData();
      await gameService.switchGameMode(GameMode.DISCOVERY);

      // Simulate 1000 steps (should give 1 cell, no experience)
      const result = await gameService.updateStepsInMode(1000);

      expect(result.resources.cells).toBe(1);
      expect(result.resources.experiencePoints).toBe(0);
      expect(result.trainingResults).toBeUndefined();
    });

    it('should handle empty training roster gracefully', async () => {
      // Set empty training roster
      (steplingService as any).trainingRoster = [];

      await gameService.initializeGameData();
      await gameService.switchGameMode(GameMode.TRAINING);

      const result = await gameService.updateStepsInMode(100);

      expect(result.resources.experiencePoints).toBe(10);
      expect(result.trainingResults).toBeDefined();
      expect(Object.keys(result.trainingResults!)).toHaveLength(0);
    });

    it('should continue working even if experience distribution fails', async () => {
      // Mock steplingService to throw an error
      const originalDistribute = steplingService.distributeExperienceToRoster;
      steplingService.distributeExperienceToRoster = jest.fn().mockRejectedValue(new Error('Distribution failed'));

      await gameService.initializeGameData();
      await gameService.switchGameMode(GameMode.TRAINING);

      const result = await gameService.updateStepsInMode(100);

      expect(result.resources.experiencePoints).toBe(10);
      expect(result.trainingResults).toBeUndefined();

      // Restore original method
      steplingService.distributeExperienceToRoster = originalDistribute;
    });
  });

  describe('Experience Point Calculations', () => {
    it('should calculate correct experience points for different step counts', async () => {
      await gameService.initializeGameData();
      await gameService.switchGameMode(GameMode.TRAINING);

      // Test various step counts
      const testCases = [
        { steps: 10, expectedExp: 1 },
        { steps: 50, expectedExp: 5 },
        { steps: 100, expectedExp: 10 },
        { steps: 250, expectedExp: 25 },
      ];

      for (const testCase of testCases) {
        // Reset steps in mode
        (gameService as any).currentModeData.stepsInMode = 0;
        
        const result = await gameService.updateStepsInMode(testCase.steps);
        expect(result.resources.experiencePoints).toBe(testCase.expectedExp);
      }
    });

    it('should only give experience for new steps, not cumulative', async () => {
      await gameService.initializeGameData();
      await gameService.switchGameMode(GameMode.TRAINING);

      // First update: 100 steps = 10 exp
      let result = await gameService.updateStepsInMode(100);
      expect(result.resources.experiencePoints).toBe(10);

      // Second update: 150 steps total = 5 new exp (50 new steps)
      result = await gameService.updateStepsInMode(150);
      expect(result.resources.experiencePoints).toBe(5);

      // Third update: same steps = 0 new exp
      result = await gameService.updateStepsInMode(150);
      expect(result.resources.experiencePoints).toBe(0);
    });
  });

  describe('Training Roster Management', () => {
    it('should allow setting and getting training roster', async () => {
      const success = await steplingService.setTrainingRoster(['stepling-1']);
      expect(success).toBe(true);

      const roster = steplingService.getTrainingRoster();
      expect(roster).toHaveLength(1);
      expect(roster[0].id).toBe('stepling-1');
    });

    it('should filter out invalid stepling IDs when setting roster', async () => {
      const success = await steplingService.setTrainingRoster(['stepling-1', 'invalid-id', 'stepling-2']);
      expect(success).toBe(true);

      const roster = steplingService.getTrainingRoster();
      expect(roster).toHaveLength(2);
      expect(roster.map(s => s.id)).toEqual(['stepling-1', 'stepling-2']);
    });

    it('should distribute experience equally among roster steplings', async () => {
      await steplingService.setTrainingRoster(['stepling-1', 'stepling-2']);

      const results = await steplingService.distributeExperienceToRoster(20);

      expect(Object.keys(results)).toHaveLength(2);
      // Each stepling gets 10 exp (20 / 2)
      // stepling-1 (level 1) needs 10 exp to reach level 2
      expect(results['stepling-1'].success).toBe(true);
      expect(results['stepling-1'].updatedStepling!.level).toBe(2);
      
      // stepling-2 (level 2) needs 20 exp to reach level 3, so stays at level 2
      expect(results['stepling-2'].success).toBe(false);
      expect(results['stepling-2'].error).toBe('Not enough experience points to level up');
    });
  });
});
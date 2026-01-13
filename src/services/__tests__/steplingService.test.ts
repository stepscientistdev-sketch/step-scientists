import { steplingService } from '../steplingService';
import { RarityTier, Stepling, Species } from '../../types';

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

describe('SteplingService', () => {
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
    level: 5,
    fusionLevel: 1,
    currentStats: {
      health: 150,
      attack: 75,
      defense: 60,
      special: 45,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStepling2: Stepling = {
    id: 'stepling-2',
    playerId: 'player-1',
    speciesId: 'species-1',
    level: 3,
    fusionLevel: 1,
    currentStats: {
      health: 130,
      attack: 65,
      defense: 52,
      special: 39,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    (steplingService as any).steplings = [mockStepling1, mockStepling2];
    (steplingService as any).trainingRoster = [];
  });

  describe('fuseSteplings', () => {
    it('should successfully fuse two steplings of the same species and fusion level', async () => {
      // Mock API response for species data
      const { apiClient } = require('../apiClient');
      apiClient.get.mockResolvedValue({ data: mockSpecies });
      apiClient.post.mockResolvedValue({ success: true });

      const result = await steplingService.fuseSteplings('stepling-1', 'stepling-2', 10);

      expect(result.success).toBe(true);
      expect(result.newStepling).toBeDefined();
      expect(result.newStepling!.fusionLevel).toBe(2);
      expect(result.newStepling!.level).toBe(1);
      expect(result.newStepling!.speciesId).toBe('species-1');
      
      // Check that fusion bonus was applied (based on average level of 4)
      const expectedBonus = Math.round(mockSpecies.baseStats.health * 0.2); // 4 * 0.05 = 0.2
      expect(result.newStepling!.currentStats.health).toBe(mockSpecies.baseStats.health + expectedBonus);
    });

    it('should fail when steplings are different species', async () => {
      const differentSpeciesStepling = { ...mockStepling2, speciesId: 'species-2' };
      (steplingService as any).steplings = [mockStepling1, differentSpeciesStepling];

      const result = await steplingService.fuseSteplings('stepling-1', 'stepling-2', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Steplings must be of the same species to fuse');
    });

    it('should fail when steplings are different fusion levels', async () => {
      const differentFusionStepling = { ...mockStepling2, fusionLevel: 2 };
      (steplingService as any).steplings = [mockStepling1, differentFusionStepling];

      const result = await steplingService.fuseSteplings('stepling-1', 'stepling-2', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Steplings must be at the same fusion level to fuse');
    });

    it('should fail when fusion level cap is reached', async () => {
      const maxFusionStepling = { ...mockStepling1, fusionLevel: 20 };
      const maxFusionStepling2 = { ...mockStepling2, fusionLevel: 20 };
      (steplingService as any).steplings = [maxFusionStepling, maxFusionStepling2];

      const result = await steplingService.fuseSteplings('stepling-1', 'stepling-2', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Maximum fusion level reached (20)');
    });
  });

  describe('levelUpStepling', () => {
    it('should successfully level up a stepling with sufficient experience', async () => {
      const { apiClient } = require('../apiClient');
      apiClient.get.mockResolvedValue({ data: mockSpecies });
      apiClient.put.mockResolvedValue({ success: true });

      // Level 5 stepling needs 5*10 = 50 exp to reach level 6
      const result = await steplingService.levelUpStepling('stepling-1', 50);

      expect(result.success).toBe(true);
      expect(result.updatedStepling!.level).toBe(6);
      
      // Check stat increase (10% of base stats)
      const expectedHealthIncrease = Math.round(mockSpecies.baseStats.health * 0.1);
      expect(result.updatedStepling!.currentStats.health).toBe(
        mockStepling1.currentStats.health + expectedHealthIncrease
      );
    });

    it('should level up multiple times with enough experience', async () => {
      const { apiClient } = require('../apiClient');
      apiClient.get.mockResolvedValue({ data: mockSpecies });
      apiClient.put.mockResolvedValue({ success: true });

      // Level 5 needs 50 exp for level 6, then 60 exp for level 7 = 110 total
      const result = await steplingService.levelUpStepling('stepling-1', 110);

      expect(result.success).toBe(true);
      expect(result.updatedStepling!.level).toBe(7);
    });

    it('should fail when stepling is at max level', async () => {
      const maxLevelStepling = { ...mockStepling1, level: 10, fusionLevel: 1 }; // Max level = 1 * 10 = 10
      (steplingService as any).steplings = [maxLevelStepling];

      const result = await steplingService.levelUpStepling('stepling-1', 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stepling is already at maximum level (10)');
    });

    it('should fail with insufficient experience', async () => {
      const { apiClient } = require('../apiClient');
      apiClient.get.mockResolvedValue({ data: mockSpecies });

      // Level 5 stepling needs 50 exp, but only giving 30
      const result = await steplingService.levelUpStepling('stepling-1', 30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not enough experience points to level up');
    });
  });

  describe('distributeExperienceToRoster', () => {
    it('should distribute experience equally among roster steplings', async () => {
      const { apiClient } = require('../apiClient');
      apiClient.get.mockResolvedValue({ data: mockSpecies });
      apiClient.put.mockResolvedValue({ success: true });

      // Set training roster
      await steplingService.setTrainingRoster(['stepling-1', 'stepling-2']);

      // Distribute 200 exp (100 each)
      const results = await steplingService.distributeExperienceToRoster(200);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results['stepling-1'].success).toBe(true);
      expect(results['stepling-2'].success).toBe(true);
      
      // Both should level up (level 5 needs 50, level 3 needs 30)
      expect(results['stepling-1'].updatedStepling!.level).toBe(6);
      expect(results['stepling-2'].updatedStepling!.level).toBe(5); // 3->4 (30 exp), 4->5 (40 exp) = 70 exp used, 30 remaining
    });

    it('should return empty results when roster is empty', async () => {
      const results = await steplingService.distributeExperienceToRoster(100);
      expect(Object.keys(results)).toHaveLength(0);
    });
  });

  describe('getFusionCandidates', () => {
    it('should return steplings of same species and fusion level', () => {
      const candidates = steplingService.getFusionCandidates('stepling-1');

      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('stepling-2');
      expect(candidates[0].speciesId).toBe(mockStepling1.speciesId);
      expect(candidates[0].fusionLevel).toBe(mockStepling1.fusionLevel);
    });

    it('should return empty array when no candidates exist', () => {
      const differentSpeciesStepling = { ...mockStepling2, speciesId: 'species-2' };
      (steplingService as any).steplings = [mockStepling1, differentSpeciesStepling];

      const candidates = steplingService.getFusionCandidates('stepling-1');
      expect(candidates).toHaveLength(0);
    });
  });
});
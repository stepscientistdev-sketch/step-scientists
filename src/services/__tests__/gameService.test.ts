import {gameService} from '../gameService';
import {GameMode, RarityTier} from '../../types';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('GameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the service state by creating a fresh instance
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('calculateResourcesFromSteps', () => {
    it('should calculate cells correctly in Discovery mode', () => {
      const resources = gameService.calculateResourcesFromSteps(2500, GameMode.DISCOVERY);
      
      expect(resources.cells).toBe(2); // 2500 / 1000 = 2
      expect(resources.experiencePoints).toBe(0);
    });

    it('should calculate XP correctly in Training mode', () => {
      const resources = gameService.calculateResourcesFromSteps(150, GameMode.TRAINING);
      
      expect(resources.cells).toBe(0);
      expect(resources.experiencePoints).toBe(15); // 150 / 10 = 15
    });
  });

  describe('getConversionRates', () => {
    it('should return correct conversion rates', () => {
      const rates = gameService.getConversionRates();
      
      expect(rates.DISCOVERY.STEPS_PER_CELL).toBe(1000);
      expect(rates.TRAINING.STEPS_PER_XP).toBe(10);
    });
  });

  describe('getMilestoneThresholds', () => {
    it('should return milestone thresholds', () => {
      const milestones = gameService.getMilestoneThresholds();
      
      expect(milestones[5000]).toBeDefined();
      expect(milestones[5000].tier).toBe(RarityTier.UNCOMMON);
      expect(milestones[10000].tier).toBe(RarityTier.RARE);
      expect(milestones[50000].tier).toBe(RarityTier.EPIC);
      expect(milestones[100000].tier).toBe(RarityTier.LEGENDARY);
    });
  });

  describe('magnifying glass inventory', () => {
    it('should start with empty inventory', async () => {
      const inventory = await gameService.getMagnifyingGlassInventory();
      expect(inventory).toHaveLength(0);
    });
  });
});
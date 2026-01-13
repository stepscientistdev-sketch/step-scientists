import { steplingService } from '../steplingService';
import { Stepling } from '../../types';

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

describe('Fusion Warning and Imperfect Flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the service's internal state
    (steplingService as any).steplings = [];
  });

  const createMockStepling = (id: string, level: number, fusionLevel: number = 1, hasSuboptimalFusion: boolean = false): Stepling => ({
    id,
    playerId: 'player1',
    speciesId: 'species1',
    level,
    fusionLevel,
    currentStats: { health: 100, attack: 50, defense: 40, special: 30 },
    hasSuboptimalFusion,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockSpeciesData = {
    id: 'species1',
    name: 'Test Species',
    baseStats: { health: 100, attack: 50, defense: 40, special: 30 },
  };

  test('should warn when trying to fuse non-maxed steplings', async () => {
    // Setup: Create two non-maxed steplings (level 5, max should be 10)
    const stepling1 = createMockStepling('step1', 5, 1);
    const stepling2 = createMockStepling('step2', 7, 1);
    
    (steplingService as any).steplings = [stepling1, stepling2];
    
    // Mock species data fetch
    (steplingService as any).getSpeciesData = jest.fn().mockResolvedValue(mockSpeciesData);

    const result = await steplingService.fuseSteplings('step1', 'step2', 10);

    expect(result.success).toBe(false);
    expect(result.error).toBe('NON_MAX_FUSION_WARNING');
    expect(result.warningData).toEqual({
      stepling1MaxLevel: 10,
      stepling2MaxLevel: 10,
      stepling1Level: 5,
      stepling2Level: 7,
    });
  });

  test('should allow fusion when forced despite non-max levels', async () => {
    // Setup: Create two non-maxed steplings
    const stepling1 = createMockStepling('step1', 5, 1);
    const stepling2 = createMockStepling('step2', 7, 1);
    
    (steplingService as any).steplings = [stepling1, stepling2];
    
    // Mock species data fetch
    (steplingService as any).getSpeciesData = jest.fn().mockResolvedValue(mockSpeciesData);
    
    // Mock storage and sync methods
    (steplingService as any).saveSteplings = jest.fn();
    (steplingService as any).syncFusionWithServer = jest.fn();

    const result = await steplingService.fuseSteplings('step1', 'step2', 10, true);

    expect(result.success).toBe(true);
    expect(result.newStepling).toBeDefined();
    expect(result.newStepling?.hasSuboptimalFusion).toBe(true);
    expect(result.newStepling?.fusionLevel).toBe(2);
  });

  test('should allow fusion of maxed steplings without warning', async () => {
    // Setup: Create two maxed steplings (level 10, max is 10)
    const stepling1 = createMockStepling('step1', 10, 1);
    const stepling2 = createMockStepling('step2', 10, 1);
    
    (steplingService as any).steplings = [stepling1, stepling2];
    
    // Mock species data fetch
    (steplingService as any).getSpeciesData = jest.fn().mockResolvedValue(mockSpeciesData);
    
    // Mock storage and sync methods
    (steplingService as any).saveSteplings = jest.fn();
    (steplingService as any).syncFusionWithServer = jest.fn();

    const result = await steplingService.fuseSteplings('step1', 'step2', 10);

    expect(result.success).toBe(true);
    expect(result.newStepling).toBeDefined();
    expect(result.newStepling?.hasSuboptimalFusion).toBe(false);
    expect(result.newStepling?.fusionLevel).toBe(2);
  });

  test('should inherit imperfect flag from parent steplings', async () => {
    // Setup: One maxed stepling and one that was previously imperfect
    const stepling1 = createMockStepling('step1', 20, 2); // maxed at fusion level 2
    const stepling2 = createMockStepling('step2', 20, 2, true); // maxed but has imperfect flag
    
    (steplingService as any).steplings = [stepling1, stepling2];
    
    // Mock species data fetch
    (steplingService as any).getSpeciesData = jest.fn().mockResolvedValue(mockSpeciesData);
    
    // Mock storage and sync methods
    (steplingService as any).saveSteplings = jest.fn();
    (steplingService as any).syncFusionWithServer = jest.fn();

    const result = await steplingService.fuseSteplings('step1', 'step2', 10);

    expect(result.success).toBe(true);
    expect(result.newStepling).toBeDefined();
    expect(result.newStepling?.hasSuboptimalFusion).toBe(true); // Should inherit the flag
    expect(result.newStepling?.fusionLevel).toBe(3);
  });

  test('should warn when one stepling is maxed and other is not', async () => {
    // Setup: One maxed and one non-maxed stepling
    const stepling1 = createMockStepling('step1', 10, 1); // maxed
    const stepling2 = createMockStepling('step2', 8, 1);  // not maxed
    
    (steplingService as any).steplings = [stepling1, stepling2];
    
    // Mock species data fetch
    (steplingService as any).getSpeciesData = jest.fn().mockResolvedValue(mockSpeciesData);

    const result = await steplingService.fuseSteplings('step1', 'step2', 10);

    expect(result.success).toBe(false);
    expect(result.error).toBe('NON_MAX_FUSION_WARNING');
    expect(result.warningData?.stepling1Level).toBe(10);
    expect(result.warningData?.stepling2Level).toBe(8);
  });
});
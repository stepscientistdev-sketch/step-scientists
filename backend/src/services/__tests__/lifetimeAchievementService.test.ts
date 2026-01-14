import {lifetimeAchievementService} from '../lifetimeAchievementService';

describe('LifetimeAchievementService', () => {
  describe('calculateBonuses', () => {
    it('should start with base bonuses at 0 steps', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(0);
      
      expect(bonuses.bonusCellsPerDay).toBe(0);
      expect(bonuses.discoveryEfficiency).toBe(0);
      expect(bonuses.trainingEfficiency).toBe(0);
      expect(bonuses.clickPower).toBe(1);
      expect(bonuses.experienceBankCap).toBe(100);
      expect(bonuses.trainingRosterSlots).toBe(10);
      expect(bonuses.releaseXpBonus).toBe(0);
    });

    it('should unlock First Steps at 10K steps', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(10000);
      
      expect(bonuses.experienceBankCap).toBe(150);
    });

    it('should unlock Getting Active at 50K steps', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(50000);
      
      expect(bonuses.clickPower).toBe(2);
      expect(bonuses.experienceBankCap).toBe(200);
    });

    it('should unlock Dedicated Walker at 100K steps', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(100000);
      
      expect(bonuses.bonusCellsPerDay).toBe(1);
      expect(bonuses.discoveryEfficiency).toBe(2);
      expect(bonuses.experienceBankCap).toBe(300);
    });

    it('should unlock Ultimate Step Scientist at 3.5M steps', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(3500000);
      
      expect(bonuses.bonusCellsPerDay).toBe(5);
      expect(bonuses.discoveryEfficiency).toBe(20);
      expect(bonuses.trainingEfficiency).toBe(20);
      expect(bonuses.clickPower).toBe(7);
      expect(bonuses.experienceBankCap).toBe(Infinity);
      expect(bonuses.trainingRosterSlots).toBe(16);
      expect(bonuses.releaseXpBonus).toBe(50);
    });
  });

  describe('calculateInfiniteProgression', () => {
    it('should add 1 bonus cell per 600K steps after 3.5M', () => {
      const progression = (lifetimeAchievementService as any).calculateInfiniteProgression(4100000);
      
      expect(progression.bonusCells).toBe(1);
    });

    it('should cap bonus cells at 10', () => {
      const progression = (lifetimeAchievementService as any).calculateInfiniteProgression(10000000);
      
      expect(progression.bonusCells).toBe(10);
    });

    it('should add 2% efficiency per 600K steps', () => {
      const progression = (lifetimeAchievementService as any).calculateInfiniteProgression(5300000);
      
      expect(progression.discoveryEfficiency).toBe(6); // 3 milestones * 2%
      expect(progression.trainingEfficiency).toBe(6);
    });

    it('should cap efficiency at 30% (50% total with base 20%)', () => {
      const progression = (lifetimeAchievementService as any).calculateInfiniteProgression(20000000);
      
      expect(progression.discoveryEfficiency).toBe(30);
      expect(progression.trainingEfficiency).toBe(30);
    });
  });

  describe('getDiscoveryStepsRequired', () => {
    it('should return 1000 steps with 0% efficiency', () => {
      const steps = lifetimeAchievementService.getDiscoveryStepsRequired(0);
      expect(steps).toBe(1000);
    });

    it('should return 980 steps with 2% efficiency', () => {
      const steps = lifetimeAchievementService.getDiscoveryStepsRequired(2);
      expect(steps).toBe(980);
    });

    it('should return 800 steps with 20% efficiency', () => {
      const steps = lifetimeAchievementService.getDiscoveryStepsRequired(20);
      expect(steps).toBe(800);
    });

    it('should return 500 steps with 50% efficiency', () => {
      const steps = lifetimeAchievementService.getDiscoveryStepsRequired(50);
      expect(steps).toBe(500);
    });
  });

  describe('getTrainingStepsRequired', () => {
    it('should return 10 steps with 0% efficiency', () => {
      const steps = lifetimeAchievementService.getTrainingStepsRequired(0);
      expect(steps).toBe(10);
    });

    it('should return 9 steps with 10% efficiency', () => {
      const steps = lifetimeAchievementService.getTrainingStepsRequired(10);
      expect(steps).toBe(9);
    });

    it('should return 8 steps with 20% efficiency', () => {
      const steps = lifetimeAchievementService.getTrainingStepsRequired(20);
      expect(steps).toBe(8);
    });

    it('should return 5 steps with 50% efficiency', () => {
      const steps = lifetimeAchievementService.getTrainingStepsRequired(50);
      expect(steps).toBe(5);
    });
  });

  describe('Balance Analysis', () => {
    it('should maintain walking as primary source at 1 year (3.5M steps)', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(3500000);
      const stepsPerCell = lifetimeAchievementService.getDiscoveryStepsRequired(bonuses.discoveryEfficiency);
      
      const bonusCells = bonuses.bonusCellsPerDay;
      const cellsFrom10KSteps = Math.floor(10000 / stepsPerCell);
      const totalCells = bonusCells + cellsFrom10KSteps;
      const walkingPercentage = (cellsFrom10KSteps / totalCells) * 100;
      
      expect(bonusCells).toBe(5);
      expect(cellsFrom10KSteps).toBeGreaterThanOrEqual(12);
      expect(walkingPercentage).toBeGreaterThanOrEqual(70);
    });

    it('should maintain balance at 2 years (7M steps)', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(3500000);
      const infiniteProgression = (lifetimeAchievementService as any).calculateInfiniteProgression(7000000);
      
      const totalDiscoveryEfficiency = Math.min(50, bonuses.discoveryEfficiency + infiniteProgression.discoveryEfficiency);
      const stepsPerCell = lifetimeAchievementService.getDiscoveryStepsRequired(totalDiscoveryEfficiency);
      
      const bonusCells = bonuses.bonusCellsPerDay + Math.min(10, infiniteProgression.bonusCells);
      const cellsFrom10KSteps = Math.floor(10000 / stepsPerCell);
      const totalCells = bonusCells + cellsFrom10KSteps;
      const walkingPercentage = (cellsFrom10KSteps / totalCells) * 100;
      
      expect(walkingPercentage).toBeGreaterThanOrEqual(55);
    });

    it('should reach 50/50 balance at efficiency cap (12.5M steps)', () => {
      const bonuses = (lifetimeAchievementService as any).calculateBonuses(3500000);
      const infiniteProgression = (lifetimeAchievementService as any).calculateInfiniteProgression(12500000);
      
      const totalDiscoveryEfficiency = Math.min(50, bonuses.discoveryEfficiency + infiniteProgression.discoveryEfficiency);
      const stepsPerCell = lifetimeAchievementService.getDiscoveryStepsRequired(totalDiscoveryEfficiency);
      
      const bonusCells = bonuses.bonusCellsPerDay + Math.min(10, infiniteProgression.bonusCells);
      const cellsFrom10KSteps = Math.floor(10000 / stepsPerCell);
      
      expect(totalDiscoveryEfficiency).toBe(50);
      expect(stepsPerCell).toBe(500);
      expect(cellsFrom10KSteps).toBe(20);
      expect(bonusCells).toBeGreaterThanOrEqual(10);
    });
  });
});

import {apiClient} from './apiClient';
import {LifetimeAchievement, AchievementUnlockResult, ApiResponse} from '@/types';

class LifetimeAchievementService {
  /**
   * Get lifetime achievements for the current player
   */
  async getAchievements(): Promise<LifetimeAchievement | null> {
    try {
      const response = await apiClient.get<ApiResponse<LifetimeAchievement>>('/achievements');
      return response.data.data || null;
    } catch (error) {
      console.error('Error getting achievements:', error);
      return null;
    }
  }

  /**
   * Update achievements based on total steps
   */
  async updateAchievements(totalSteps: number): Promise<AchievementUnlockResult | null> {
    try {
      const response = await apiClient.post<ApiResponse<AchievementUnlockResult>>('/achievements/update', {
        totalSteps,
      });
      return response.data.data || null;
    } catch (error) {
      console.error('Error updating achievements:', error);
      return null;
    }
  }

  /**
   * Claim daily bonus cells
   */
  async claimDailyBonus(): Promise<{bonusCells: number; claimed: boolean} | null> {
    try {
      const response = await apiClient.post<ApiResponse<{bonusCells: number; claimed: boolean}>>('/achievements/claim-daily');
      return response.data.data || null;
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      return null;
    }
  }

  /**
   * Calculate steps required per cell with efficiency bonus
   */
  getDiscoveryStepsRequired(discoveryEfficiency: number): number {
    const baseSteps = 1000;
    const reduction = baseSteps * (discoveryEfficiency / 100);
    return Math.floor(baseSteps - reduction);
  }

  /**
   * Calculate steps required per XP with efficiency bonus
   */
  getTrainingStepsRequired(trainingEfficiency: number): number {
    const baseSteps = 10;
    const reduction = baseSteps * (trainingEfficiency / 100);
    return Math.floor(baseSteps - reduction);
  }

  /**
   * Get next achievement milestone
   */
  getNextMilestone(totalSteps: number): {steps: number; name: string} | null {
    const milestones = [
      {steps: 10000, name: 'First Steps'},
      {steps: 50000, name: 'Getting Active'},
      {steps: 100000, name: 'Dedicated Walker'},
      {steps: 200000, name: 'Consistent Mover'},
      {steps: 300000, name: 'Fitness Enthusiast'},
      {steps: 600000, name: 'Marathon Mindset'},
      {steps: 900000, name: 'Endurance Expert'},
      {steps: 1200000, name: 'Distance Devotee'},
      {steps: 1800000, name: 'Fitness Warrior'},
      {steps: 2400000, name: 'Walking Legend'},
      {steps: 3000000, name: 'Fitness Master'},
      {steps: 3500000, name: 'Ultimate Step Scientist'},
    ];

    for (const milestone of milestones) {
      if (totalSteps < milestone.steps) {
        return milestone;
      }
    }

    // After 3.5M, calculate next infinite progression milestone
    if (totalSteps >= 3500000) {
      const stepsAbove3_5M = totalSteps - 3500000;
      const nextMilestone = Math.ceil((stepsAbove3_5M + 1) / 600000) * 600000;
      return {
        steps: 3500000 + nextMilestone,
        name: 'Infinite Progression',
      };
    }

    return null;
  }

  /**
   * Calculate progress to next milestone (0-100)
   */
  getMilestoneProgress(totalSteps: number): number {
    const next = this.getNextMilestone(totalSteps);
    if (!next) return 100;

    // Find previous milestone
    const milestones = [0, 10000, 50000, 100000, 200000, 300000, 600000, 900000, 1200000, 1800000, 2400000, 3000000, 3500000];
    let previous = 0;
    for (const milestone of milestones) {
      if (milestone <= totalSteps) {
        previous = milestone;
      }
    }

    // Handle infinite progression
    if (totalSteps >= 3500000) {
      const stepsAbove3_5M = totalSteps - 3500000;
      const currentMilestone = Math.floor(stepsAbove3_5M / 600000);
      previous = 3500000 + (currentMilestone * 600000);
    }

    const range = next.steps - previous;
    const progress = totalSteps - previous;
    return Math.min(100, Math.floor((progress / range) * 100));
  }
}

export const lifetimeAchievementService = new LifetimeAchievementService();

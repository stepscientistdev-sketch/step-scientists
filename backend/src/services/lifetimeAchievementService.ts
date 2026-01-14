import {database as db} from '../config/database';
import {LifetimeAchievement, LifetimeAchievementModel, AchievementDefinition, AchievementUnlockResult} from '../types';

// Achievement definitions based on LIFETIME_ACHIEVEMENTS.md
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Tier 1: Early Journey
  {steps: 10000, name: 'First Steps', rewards: {experienceBankCap: 150}},
  {steps: 50000, name: 'Getting Active', rewards: {clickPower: 2, experienceBankCap: 200}},
  {steps: 100000, name: 'Dedicated Walker', rewards: {bonusCellsPerDay: 1, discoveryEfficiency: 2, experienceBankCap: 300}},
  {steps: 200000, name: 'Consistent Mover', rewards: {trainingEfficiency: 5, experienceBankCap: 400}},
  {steps: 300000, name: 'Fitness Enthusiast', rewards: {trainingRosterSlots: 12, experienceBankCap: 500}},
  
  // Tier 2: Building Momentum
  {steps: 600000, name: 'Marathon Mindset', rewards: {bonusCellsPerDay: 2, discoveryEfficiency: 4, experienceBankCap: 650}},
  {steps: 900000, name: 'Endurance Expert', rewards: {clickPower: 3, trainingEfficiency: 10, experienceBankCap: 800}},
  {steps: 1200000, name: 'Distance Devotee', rewards: {bonusCellsPerDay: 3, discoveryEfficiency: 6, experienceBankCap: 1000}},
  {steps: 1800000, name: 'Fitness Warrior', rewards: {trainingRosterSlots: 14, trainingEfficiency: 15, experienceBankCap: 1500}},
  
  // Tier 3: Mastery Path
  {steps: 2400000, name: 'Walking Legend', rewards: {bonusCellsPerDay: 4, discoveryEfficiency: 8, clickPower: 4, experienceBankCap: 2000}},
  {steps: 3000000, name: 'Fitness Master', rewards: {trainingEfficiency: 20, releaseXpBonus: 50, experienceBankCap: 3000}},
  {steps: 3500000, name: 'Ultimate Step Scientist', rewards: {bonusCellsPerDay: 5, discoveryEfficiency: 20, trainingRosterSlots: 16, clickPower: 7, experienceBankCap: Infinity}},
];

class LifetimeAchievementService {
  /**
   * Initialize lifetime achievements for a new player
   */
  async initializeForPlayer(playerId: string): Promise<LifetimeAchievement> {
    const achievement: Omit<LifetimeAchievementModel, 'id' | 'created_at' | 'updated_at'> = {
      player_id: playerId,
      bonus_cells_per_day: 0,
      discovery_efficiency: 0,
      training_efficiency: 0,
      click_power: 1,
      experience_bank_cap: 100,
      training_roster_slots: 10,
      release_xp_bonus: 0,
      unlocked_achievements: '[]',
      last_daily_bonus_claim: null,
    };

    const [inserted] = await db('lifetime_achievements')
      .insert(achievement)
      .returning('*');

    return this.modelToAchievement(inserted);
  }

  /**
   * Get lifetime achievements for a player
   */
  async getByPlayerId(playerId: string): Promise<LifetimeAchievement | null> {
    const model = await db('lifetime_achievements')
      .where({player_id: playerId})
      .first();

    return model ? this.modelToAchievement(model) : null;
  }

  /**
   * Calculate and update achievements based on total steps
   */
  async updateAchievements(playerId: string, totalSteps: number): Promise<AchievementUnlockResult> {
    let achievement = await this.getByPlayerId(playerId);
    
    if (!achievement) {
      achievement = await this.initializeForPlayer(playerId);
    }

    const currentUnlocked = achievement.unlocked_achievements;
    const newAchievements: AchievementDefinition[] = [];

    // Calculate bonuses from fixed achievements
    const bonuses = this.calculateBonuses(totalSteps);

    // Find newly unlocked achievements
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const achievementId = `${def.steps}_${def.name.replace(/\s+/g, '_')}`;
      if (totalSteps >= def.steps && !currentUnlocked.includes(achievementId)) {
        newAchievements.push(def);
        currentUnlocked.push(achievementId);
      }
    }

    // Calculate infinite progression bonuses (after 3.5M steps)
    if (totalSteps > 3500000) {
      const infiniteBonuses = this.calculateInfiniteProgression(totalSteps);
      bonuses.bonusCellsPerDay += infiniteBonuses.bonusCells;
      bonuses.discoveryEfficiency = Math.min(50, bonuses.discoveryEfficiency + infiniteBonuses.discoveryEfficiency);
      bonuses.trainingEfficiency = Math.min(50, bonuses.trainingEfficiency + infiniteBonuses.trainingEfficiency);
    }

    // Update database
    const updated = await db('lifetime_achievements')
      .where({player_id: playerId})
      .update({
        bonus_cells_per_day: bonuses.bonusCellsPerDay,
        discovery_efficiency: bonuses.discoveryEfficiency,
        training_efficiency: bonuses.trainingEfficiency,
        click_power: bonuses.clickPower,
        experience_bank_cap: bonuses.experienceBankCap,
        training_roster_slots: bonuses.trainingRosterSlots,
        release_xp_bonus: bonuses.releaseXpBonus,
        unlocked_achievements: JSON.stringify(currentUnlocked),
        updated_at: new Date(),
      })
      .returning('*');

    return {
      newAchievements,
      updatedBonuses: this.modelToAchievement(updated[0]),
    };
  }

  /**
   * Calculate bonuses from fixed achievement tiers
   */
  private calculateBonuses(totalSteps: number) {
    const bonuses = {
      bonusCellsPerDay: 0,
      discoveryEfficiency: 0,
      trainingEfficiency: 0,
      clickPower: 1,
      experienceBankCap: 100,
      trainingRosterSlots: 10,
      releaseXpBonus: 0,
    };

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (totalSteps >= def.steps) {
        if (def.rewards.bonusCellsPerDay) bonuses.bonusCellsPerDay = def.rewards.bonusCellsPerDay;
        if (def.rewards.discoveryEfficiency) bonuses.discoveryEfficiency = def.rewards.discoveryEfficiency;
        if (def.rewards.trainingEfficiency) bonuses.trainingEfficiency = def.rewards.trainingEfficiency;
        if (def.rewards.clickPower) bonuses.clickPower = def.rewards.clickPower;
        if (def.rewards.experienceBankCap) bonuses.experienceBankCap = def.rewards.experienceBankCap;
        if (def.rewards.trainingRosterSlots) bonuses.trainingRosterSlots = def.rewards.trainingRosterSlots;
        if (def.rewards.releaseXpBonus) bonuses.releaseXpBonus = def.rewards.releaseXpBonus;
      }
    }

    return bonuses;
  }

  /**
   * Calculate infinite progression bonuses (after 3.5M steps)
   */
  private calculateInfiniteProgression(totalSteps: number) {
    const stepsAbove3_5M = totalSteps - 3500000;
    const milestones = Math.floor(stepsAbove3_5M / 600000);

    // Bonus cells: +1 per milestone, capped at 10 total at 6.5M steps (5 milestones)
    const bonusCells = Math.min(10, milestones);

    // Discovery efficiency: +2% per milestone, capped at 50% total
    // Base from achievements is 20%, so can add up to 30% more
    const discoveryEfficiency = Math.min(30, milestones * 2);

    // Training efficiency: +2% per milestone, capped at 50% total
    // Base from achievements is 20%, so can add up to 30% more
    const trainingEfficiency = Math.min(30, milestones * 2);

    return {
      bonusCells,
      discoveryEfficiency,
      trainingEfficiency,
    };
  }

  /**
   * Claim daily bonus cells
   */
  async claimDailyBonus(playerId: string): Promise<number> {
    const achievement = await this.getByPlayerId(playerId);
    
    if (!achievement) {
      return 0;
    }

    const now = new Date();
    const lastClaim = achievement.last_daily_bonus_claim;

    // Check if already claimed today
    if (lastClaim) {
      const lastClaimDate = new Date(lastClaim);
      const isSameDay = lastClaimDate.toDateString() === now.toDateString();
      
      if (isSameDay) {
        return 0; // Already claimed today
      }
    }

    // Update last claim timestamp
    await db('lifetime_achievements')
      .where({player_id: playerId})
      .update({
        last_daily_bonus_claim: now,
        updated_at: now,
      });

    return achievement.bonus_cells_per_day;
  }

  /**
   * Get steps required per cell with efficiency bonus
   */
  getDiscoveryStepsRequired(discoveryEfficiency: number): number {
    const baseSteps = 1000;
    const reduction = baseSteps * (discoveryEfficiency / 100);
    return Math.floor(baseSteps - reduction);
  }

  /**
   * Get steps required per XP with efficiency bonus
   */
  getTrainingStepsRequired(trainingEfficiency: number): number {
    const baseSteps = 10;
    const reduction = baseSteps * (trainingEfficiency / 100);
    return Math.floor(baseSteps - reduction);
  }

  /**
   * Convert database model to domain object
   */
  private modelToAchievement(model: LifetimeAchievementModel): LifetimeAchievement {
    return {
      ...model,
      unlocked_achievements: JSON.parse(model.unlocked_achievements),
    };
  }
}

export const lifetimeAchievementService = new LifetimeAchievementService();

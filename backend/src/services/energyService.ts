import { db } from '../db';

export interface PlayerEnergy {
  current: number;
  max: number;
  lastRegenTime: Date;
  lastStepCount: number;
}

export interface EnergyUpdateResult {
  energy: PlayerEnergy;
  passiveRegenAmount: number;
  activeRegenAmount: number;
}

const ENERGY_CONFIG = {
  maxCapacity: 10,
  battleCost: 1,
  passiveRegenInterval: 30 * 60 * 1000, // 30 minutes in ms
  passiveRegenAmount: 1,
  stepsPerEnergy: 1000,
  activeRegenAmount: 1
};

export class EnergyService {
  /**
   * Calculate passive energy regeneration based on time elapsed
   */
  private calculatePassiveRegen(energy: PlayerEnergy): {
    newEnergy: number;
    newLastRegenTime: Date;
    regenAmount: number;
  } {
    const now = new Date();
    const timeSinceLastRegen = now.getTime() - energy.lastRegenTime.getTime();
    const intervalsElapsed = Math.floor(timeSinceLastRegen / ENERGY_CONFIG.passiveRegenInterval);
    
    if (intervalsElapsed > 0) {
      const regenAmount = intervalsElapsed * ENERGY_CONFIG.passiveRegenAmount;
      const newEnergy = Math.min(energy.current + regenAmount, energy.max);
      
      // Update last regen time to the last complete interval
      const newLastRegenTime = new Date(
        energy.lastRegenTime.getTime() + 
        (intervalsElapsed * ENERGY_CONFIG.passiveRegenInterval)
      );
      
      return { newEnergy, newLastRegenTime, regenAmount };
    }
    
    return { 
      newEnergy: energy.current, 
      newLastRegenTime: energy.lastRegenTime, 
      regenAmount: 0 
    };
  }

  /**
   * Calculate active energy from steps walked
   */
  private calculateActiveRegen(energy: PlayerEnergy, currentSteps: number): {
    newEnergy: number;
    newLastStepCount: number;
    energyEarned: number;
  } {
    const stepsSinceLastCheck = currentSteps - energy.lastStepCount;
    const energyEarned = Math.floor(stepsSinceLastCheck / ENERGY_CONFIG.stepsPerEnergy);
    
    if (energyEarned > 0) {
      const newEnergy = Math.min(energy.current + energyEarned, energy.max);
      const stepsConsumed = energyEarned * ENERGY_CONFIG.stepsPerEnergy;
      const newLastStepCount = energy.lastStepCount + stepsConsumed;
      
      return { newEnergy, newLastStepCount, energyEarned };
    }
    
    return { 
      newEnergy: energy.current, 
      newLastStepCount: energy.lastStepCount, 
      energyEarned: 0 
    };
  }

  /**
   * Get player's current energy status
   */
  async getPlayerEnergy(playerId: string): Promise<PlayerEnergy> {
    const player = await db('players')
      .where({ id: playerId })
      .first();
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    return {
      current: player.energy_current,
      max: player.energy_max,
      lastRegenTime: new Date(player.energy_last_regen_time),
      lastStepCount: player.energy_last_step_count
    };
  }

  /**
   * Update energy based on time and steps
   */
  async updateEnergy(playerId: string, currentSteps: number): Promise<EnergyUpdateResult> {
    const energy = await this.getPlayerEnergy(playerId);
    
    // Apply passive regen
    const passiveResult = this.calculatePassiveRegen(energy);
    energy.current = passiveResult.newEnergy;
    energy.lastRegenTime = passiveResult.newLastRegenTime;
    
    // Apply active regen from steps
    const activeResult = this.calculateActiveRegen(energy, currentSteps);
    energy.current = activeResult.newEnergy;
    energy.lastStepCount = activeResult.newLastStepCount;
    
    // Save updated energy
    await db('players')
      .where({ id: playerId })
      .update({
        energy_current: energy.current,
        energy_last_regen_time: energy.lastRegenTime,
        energy_last_step_count: energy.lastStepCount
      });
    
    return {
      energy,
      passiveRegenAmount: passiveResult.regenAmount,
      activeRegenAmount: activeResult.energyEarned
    };
  }

  /**
   * Check if player has enough energy for battle
   */
  async canStartBattle(playerId: string): Promise<boolean> {
    const energy = await this.getPlayerEnergy(playerId);
    return energy.current >= ENERGY_CONFIG.battleCost;
  }

  /**
   * Consume energy for battle
   */
  async consumeEnergy(playerId: string, amount: number = ENERGY_CONFIG.battleCost): Promise<boolean> {
    const energy = await this.getPlayerEnergy(playerId);
    
    if (energy.current >= amount) {
      await db('players')
        .where({ id: playerId })
        .update({
          energy_current: energy.current - amount
        });
      return true;
    }
    
    return false;
  }

  /**
   * Get time until next passive regen (in milliseconds)
   */
  async getTimeUntilNextRegen(playerId: string): Promise<number> {
    const energy = await this.getPlayerEnergy(playerId);
    const now = new Date();
    const timeSinceLastRegen = now.getTime() - energy.lastRegenTime.getTime();
    const timeUntilNext = ENERGY_CONFIG.passiveRegenInterval - 
      (timeSinceLastRegen % ENERGY_CONFIG.passiveRegenInterval);
    return timeUntilNext;
  }

  /**
   * Get steps until next active regen
   */
  async getStepsUntilNextRegen(playerId: string, currentSteps: number): Promise<number> {
    const energy = await this.getPlayerEnergy(playerId);
    const stepsSinceLastCheck = currentSteps - energy.lastStepCount;
    const stepsUntilNext = ENERGY_CONFIG.stepsPerEnergy - 
      (stepsSinceLastCheck % ENERGY_CONFIG.stepsPerEnergy);
    return stepsUntilNext;
  }
}

export const energyService = new EnergyService();

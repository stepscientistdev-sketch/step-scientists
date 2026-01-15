import { database as db } from '../config/database';
import { Stepling, Species, SteplingStats } from '../types';

export interface LevelUpResult {
  success: boolean;
  stepling?: Stepling;
  error?: string;
}

export interface FusionResult {
  success: boolean;
  newStepling?: Stepling;
  error?: string;
}

class SteplingServiceImpl {
  async getPlayerSteplings(playerId: string): Promise<Stepling[]> {
    try {
      const steplings = await db('steplings')
        .leftJoin('species', 'steplings.species_id', 'species.id')
        .where('steplings.player_id', playerId)
        .select(
          'steplings.*',
          'species.name as species_name',
          'species.rarity_tier as species_rarity'
        );

      return steplings.map((stepling) => this.mapDbSteplingToSteplingWithSpecies(stepling));
    } catch (error) {
      console.error('Error getting player steplings:', error);
      throw new Error('Failed to retrieve steplings');
    }
  }

  async getStepling(steplingId: string, playerId: string): Promise<Stepling | null> {
    try {
      const stepling = await db('steplings')
        .where({ id: steplingId, player_id: playerId })
        .first();

      return stepling ? this.mapDbSteplingToStepling(stepling) : null;
    } catch (error) {
      console.error('Error getting stepling:', error);
      throw new Error('Failed to retrieve stepling');
    }
  }

  async createStepling(playerId: string, speciesId: string): Promise<Stepling> {
    console.log(`🔧 [SERVICE] Creating stepling: playerId=${playerId}, speciesId=${speciesId}`);
    
    try {
      // Validate UUIDs first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new Error(`Invalid player UUID: ${playerId}`);
      }
      if (!uuidRegex.test(speciesId)) {
        throw new Error(`Invalid species UUID: ${speciesId}`);
      }
      
      console.log(`🔧 [SERVICE] UUIDs validated successfully`);
      
      // Get species data for base stats
      const species = await db('species').where('id', speciesId).first();
      console.log(`🔧 [SERVICE] Species query result:`, species ? `${species.name} (${species.id})` : 'null');
      
      if (!species) {
        throw new Error(`Species not found for ID: ${speciesId}`);
      }

      const steplingData = {
        player_id: playerId,
        species_id: speciesId,
        level: 1,
        fusion_level: 1,
        current_stats: species.base_stats,
      };
      
      console.log(`🔧 [SERVICE] Inserting stepling data:`, JSON.stringify(steplingData, null, 2));

      const [newStepling] = await db('steplings')
        .insert(steplingData)
        .returning('*');
        
      console.log(`🔧 [SERVICE] Database insert successful:`, newStepling);

      const result = this.mapDbSteplingToStepling(newStepling);
      console.log(`🔧 [SERVICE] Mapped result:`, result);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('❌ [SERVICE] Detailed error creating stepling:', error);
      console.error('❌ [SERVICE] Error stack:', errorStack);
      throw new Error(`Failed to create stepling: ${errorMessage}`);
    }
  }

  async updateStepling(steplingId: string, playerId: string, updateData: Partial<Stepling>): Promise<Stepling | null> {
    try {
      const dbUpdateData: any = {};
      
      if (updateData.level !== undefined) dbUpdateData.level = updateData.level;
      if (updateData.fusion_level !== undefined) dbUpdateData.fusion_level = updateData.fusion_level;
      if (updateData.current_stats !== undefined) dbUpdateData.current_stats = updateData.current_stats;
      
      dbUpdateData.updated_at = new Date();

      const [updatedStepling] = await db('steplings')
        .where({ id: steplingId, player_id: playerId })
        .update(dbUpdateData)
        .returning('*');

      return updatedStepling ? this.mapDbSteplingToStepling(updatedStepling) : null;
    } catch (error) {
      console.error('Error updating stepling:', error);
      throw new Error('Failed to update stepling');
    }
  }

  async processFusion(playerId: string, newSteplingData: Stepling, removedSteplingIds: string[]): Promise<Stepling> {
    const trx = await db.transaction();
    
    try {
      // Verify the steplings belong to the player and exist
      const steplingsToRemove = await trx('steplings')
        .whereIn('id', removedSteplingIds)
        .where('player_id', playerId)
        .select('*');

      if (steplingsToRemove.length !== 2) {
        throw new Error('Invalid steplings for fusion');
      }

      // Validate fusion requirements
      const [stepling1, stepling2] = steplingsToRemove;
      if (stepling1.species_id !== stepling2.species_id) {
        throw new Error('Steplings must be of the same species');
      }

      if (stepling1.fusion_level !== stepling2.fusion_level) {
        throw new Error('Steplings must be at the same fusion level');
      }

      // Check if either stepling is not at max level (suboptimal fusion)
      const maxLevel = stepling1.fusion_level * 10;
      const isSuboptimalFusion = stepling1.level < maxLevel || stepling2.level < maxLevel;
      
      // Inherit suboptimal fusion flag from parents or set if current fusion is suboptimal
      const hasSuboptimalFusion = isSuboptimalFusion || 
                                  stepling1.has_suboptimal_fusion || 
                                  stepling2.has_suboptimal_fusion;

      // Remove the old steplings
      await trx('steplings')
        .whereIn('id', removedSteplingIds)
        .del();

      // Create the new stepling
      const steplingData = {
        player_id: playerId,
        species_id: newSteplingData.species_id,
        level: newSteplingData.level,
        fusion_level: newSteplingData.fusion_level,
        current_stats: newSteplingData.current_stats,
        has_suboptimal_fusion: hasSuboptimalFusion,
      };

      const [createdStepling] = await trx('steplings')
        .insert(steplingData)
        .returning('*');

      await trx.commit();
      return this.mapDbSteplingToStepling(createdStepling);
    } catch (error) {
      await trx.rollback();
      console.error('Error processing fusion:', error);
      throw new Error('Failed to process fusion');
    }
  }

  async getFusionCandidates(steplingId: string, playerId: string): Promise<Stepling[]> {
    try {
      const targetStepling = await this.getStepling(steplingId, playerId);
      if (!targetStepling) {
        return [];
      }

      const candidates = await db('steplings')
        .where({
          player_id: playerId,
          species_id: targetStepling.species_id,
          fusion_level: targetStepling.fusion_level,
        })
        .whereNot('id', steplingId)
        .select('*');

      return candidates.map(this.mapDbSteplingToStepling);
    } catch (error) {
      console.error('Error getting fusion candidates:', error);
      throw new Error('Failed to get fusion candidates');
    }
  }

  async levelUpStepling(steplingId: string, playerId: string, experiencePoints: number): Promise<LevelUpResult> {
    try {
      const stepling = await this.getStepling(steplingId, playerId);
      if (!stepling) {
        return { success: false, error: 'Stepling not found' };
      }

      const maxLevel = stepling.fusion_level * 10;
      if (stepling.level >= maxLevel) {
        return { success: false, error: `Stepling is already at maximum level (${maxLevel})` };
      }

      // Get species data for base stats
      const species = await db('species').where('id', stepling.species_id).first();
      if (!species) {
        return { success: false, error: 'Species data not found' };
      }

      // Calculate level ups
      let currentLevel = stepling.level;
      let remainingExp = experiencePoints;
      let newStats = { ...stepling.current_stats };

      while (remainingExp > 0 && currentLevel < maxLevel) {
        const expRequired = currentLevel * 10; // Formula: required_exp = current_level × 10
        
        if (remainingExp >= expRequired) {
          remainingExp -= expRequired;
          currentLevel++;
          
          // Increase stats by 10% of base stats (2% for regen/lifesteal)
          const statIncrease = this.calculateStatIncrease(species.base_stats);
          newStats.hp += statIncrease.hp;
          newStats.attack += statIncrease.attack;
          newStats.defense += statIncrease.defense;
          newStats.speed += statIncrease.speed;
          newStats.regen = Math.min(100, newStats.regen + statIncrease.regen); // Cap at 100%
          newStats.lifesteal = Math.min(100, newStats.lifesteal + statIncrease.lifesteal); // Cap at 100%
        } else {
          break;
        }
      }

      if (currentLevel === stepling.level) {
        return { success: false, error: 'Not enough experience points to level up' };
      }

      // Update the stepling
      const updatedStepling = await this.updateStepling(steplingId, playerId, {
        level: currentLevel,
        current_stats: newStats,
      });

      if (!updatedStepling) {
        return { success: false, error: 'Failed to update stepling' };
      }

      return { success: true, stepling: updatedStepling };
    } catch (error) {
      console.error('Error leveling up stepling:', error);
      return { success: false, error: 'Failed to level up stepling' };
    }
  }

  async getDiscoveredSpeciesCount(playerId: string): Promise<number> {
    try {
      const result = await db('steplings')
        .where('player_id', playerId)
        .countDistinct('species_id as count')
        .first();

      return parseInt(String(result?.count || '0'));
    } catch (error) {
      console.error('Error getting discovered species count:', error);
      return 0;
    }
  }

  async deleteStepling(steplingId: string, playerId: string): Promise<boolean> {
    try {
      const deletedCount = await db('steplings')
        .where({ id: steplingId, player_id: playerId })
        .del();

      return deletedCount > 0;
    } catch (error) {
      console.error('Error deleting stepling:', error);
      throw new Error('Failed to delete stepling');
    }
  }

  private calculateStatIncrease(baseStats: SteplingStats): SteplingStats {
    // 10% of base stats for main stats, 2% for regen/lifesteal (to avoid hitting 100% cap too fast)
    return {
      hp: Math.round(baseStats.hp * 0.1),
      attack: Math.round(baseStats.attack * 0.1),
      defense: Math.round(baseStats.defense * 0.1),
      speed: Math.round(baseStats.speed * 0.1),
      regen: Math.min(100, Math.round(baseStats.regen * 0.02 * 100) / 100), // 2% growth, capped at 100%
      lifesteal: Math.min(100, Math.round(baseStats.lifesteal * 0.02 * 100) / 100), // 2% growth, capped at 100%
    };
  }

  private mapDbSteplingToStepling(dbStepling: any): Stepling {
    return {
      id: dbStepling.id,
      player_id: dbStepling.player_id,
      species_id: dbStepling.species_id,
      level: dbStepling.level,
      fusion_level: dbStepling.fusion_level,
      current_stats: dbStepling.current_stats,
      has_suboptimal_fusion: dbStepling.has_suboptimal_fusion || false,
      created_at: new Date(dbStepling.created_at),
      updated_at: new Date(dbStepling.updated_at),
    };
  }

  private mapDbSteplingToSteplingWithSpecies(dbStepling: any): any {
    const emojiMap: { [key: string]: string } = {
      'Grasshopper': '🦗',
      'Pebble Turtle': '🐢',
      'Flame Salamander': '🦎',
      'Crystal Beetle': '🪲',
      'Storm Eagle': '🦅'
    };

    return {
      id: dbStepling.id,
      player_id: dbStepling.player_id,
      species_id: dbStepling.species_id,
      level: dbStepling.level,
      fusion_level: dbStepling.fusion_level,
      current_stats: dbStepling.current_stats,
      has_suboptimal_fusion: dbStepling.has_suboptimal_fusion || false,
      created_at: new Date(dbStepling.created_at),
      updated_at: new Date(dbStepling.updated_at),
      species: {
        name: dbStepling.species_name || 'Unknown',
        emoji: emojiMap[dbStepling.species_name] || '❓',
        rarity: dbStepling.species_rarity || 'common'
      }
    };
  }
}

export const steplingService = new SteplingServiceImpl();
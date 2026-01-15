import { database as db } from '../config/database';

export interface Boss {
  tier: number;
  baseHP: number;
  baseAttack: number;
  baseSpeed: number;
  currentHP: number;
  currentAttack: number;
  currentSpeed: number;
  turn: number;
}

export interface Stepling {
  id: string;
  name: string;
  currentHP: number;
  maxHP: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    regen: number;
    lifesteal: number;
  };
}

export interface BattleFormation {
  front: number[]; // Indices 0-2
  middle: number[]; // Indices 3-5
  back: number[]; // Indices 6-9
}

export interface BattleEvent {
  turn: number;
  actor: string;
  action: 'attack' | 'heal' | 'death' | 'regen' | 'lifesteal';
  target: string;
  value: number;
  timestamp: Date;
}

export interface BattleState {
  battleId: string;
  playerId: string;
  boss: Boss;
  team: Stepling[];
  formation: BattleFormation;
  turn: number;
  totalDamage: number;
  battleLog: BattleEvent[];
  status: 'ongoing' | 'victory' | 'defeat';
}

export interface BattleResult {
  victory: boolean;
  turnsSurvived: number;
  totalDamage: number;
  score: number;
  gemsEarned: number;
  newTierUnlocked?: number;
  battleLog: BattleEvent[];
}

const BOSS_TIERS = {
  1: { hp: 10000, attack: 100, speed: 50, unlockTurn: 0 },
  2: { hp: 30000, attack: 300, speed: 150, unlockTurn: 10 },
  3: { hp: 90000, attack: 900, speed: 450, unlockTurn: 20 },
  4: { hp: 270000, attack: 2700, speed: 1350, unlockTurn: 30 },
  5: { hp: 810000, attack: 8100, speed: 4050, unlockTurn: 40 }
};

export class BattleService {
  /**
   * Initialize a new boss based on tier
   */
  private initializeBoss(tier: number): Boss {
    const config = BOSS_TIERS[tier as keyof typeof BOSS_TIERS];
    if (!config) {
      throw new Error(`Invalid boss tier: ${tier}`);
    }
    
    return {
      tier,
      baseHP: config.hp,
      baseAttack: config.attack,
      baseSpeed: config.speed,
      currentHP: config.hp,
      currentAttack: config.attack,
      currentSpeed: config.speed,
      turn: 0
    };
  }
  
  /**
   * Scale boss stats for the current turn
   */
  private scaleBoss(boss: Boss): void {
    boss.currentHP *= 1.10;      // +10% HP
    boss.currentAttack *= 1.10;  // +10% Attack
    boss.currentSpeed *= 1.05;   // +5% Speed
  }
  
  /**
   * Calculate turn order based on speed
   */
  private calculateTurnOrder(steplings: Stepling[], boss: Boss): Array<Stepling | Boss> {
    const combatants: Array<Stepling | Boss> = [
      ...steplings.filter(s => s.currentHP > 0),
      boss
    ];
    
    return combatants.sort((a, b) => {
      const aSpeed = 'stats' in a ? a.stats.speed : a.currentSpeed;
      const bSpeed = 'stats' in b ? b.stats.speed : b.currentSpeed;
      return bSpeed - aSpeed;
    });
  }
  
  /**
   * Apply regen healing to stepling
   */
  private applyRegen(stepling: Stepling): number {
    const healAmount = stepling.maxHP * (stepling.stats.regen / 100);
    stepling.currentHP = Math.min(stepling.currentHP + healAmount, stepling.maxHP);
    return healAmount;
  }
  
  /**
   * Apply lifesteal healing to stepling
   */
  private applyLifesteal(stepling: Stepling, damageDealt: number): number {
    const healAmount = damageDealt * (stepling.stats.lifesteal / 100);
    stepling.currentHP = Math.min(stepling.currentHP + healAmount, stepling.maxHP);
    return healAmount;
  }
  
  /**
   * Get active row for boss targeting
   */
  private getActiveRow(team: Stepling[], formation: BattleFormation): Stepling[] {
    // Check front row
    const frontAlive = formation.front
      .map(idx => team[idx])
      .filter(s => s && s.currentHP > 0);
    if (frontAlive.length > 0) return frontAlive;
    
    // Check middle row
    const middleAlive = formation.middle
      .map(idx => team[idx])
      .filter(s => s && s.currentHP > 0);
    if (middleAlive.length > 0) return middleAlive;
    
    // Check back row
    const backAlive = formation.back
      .map(idx => team[idx])
      .filter(s => s && s.currentHP > 0);
    return backAlive;
  }
  
  /**
   * Calculate boss damage to stepling
   */
  private calculateBossDamage(boss: Boss, target: Stepling): number {
    const baseDamage = boss.currentAttack;
    const damageReduction = target.stats.defense / (target.stats.defense + 100);
    return baseDamage * (1 - damageReduction);
  }
  
  /**
   * Execute stepling's turn
   */
  private executeSteplingTurn(stepling: Stepling, state: BattleState): void {
    // 1. Regen
    const regenAmount = this.applyRegen(stepling);
    if (regenAmount > 0) {
      state.battleLog.push({
        turn: state.turn,
        actor: stepling.name,
        action: 'regen',
        target: stepling.name,
        value: Math.round(regenAmount),
        timestamp: new Date()
      });
    }
    
    // 2. Attack boss
    const damage = stepling.stats.attack;
    state.boss.currentHP -= damage;
    state.totalDamage += damage;
    state.battleLog.push({
      turn: state.turn,
      actor: stepling.name,
      action: 'attack',
      target: 'Boss',
      value: damage,
      timestamp: new Date()
    });
    
    // 3. Lifesteal
    const lifestealAmount = this.applyLifesteal(stepling, damage);
    if (lifestealAmount > 0) {
      state.battleLog.push({
        turn: state.turn,
        actor: stepling.name,
        action: 'lifesteal',
        target: stepling.name,
        value: Math.round(lifestealAmount),
        timestamp: new Date()
      });
    }
  }
  
  /**
   * Execute boss's turn
   */
  private executeBossTurn(state: BattleState): void {
    const activeRow = this.getActiveRow(state.team, state.formation);
    if (activeRow.length === 0) return;
    
    const target = activeRow[Math.floor(Math.random() * activeRow.length)];
    const damage = this.calculateBossDamage(state.boss, target);
    
    target.currentHP -= damage;
    state.battleLog.push({
      turn: state.turn,
      actor: 'Boss',
      action: 'attack',
      target: target.name,
      value: Math.round(damage),
      timestamp: new Date()
    });
    
    if (target.currentHP <= 0) {
      state.battleLog.push({
        turn: state.turn,
        actor: target.name,
        action: 'death',
        target: target.name,
        value: 0,
        timestamp: new Date()
      });
    }
  }
  
  /**
   * Check if all steplings are dead
   */
  private allSteplingsDead(team: Stepling[]): boolean {
    return team.every(s => s.currentHP <= 0);
  }
  
  /**
   * Simulate complete battle
   */
  async simulateBattle(state: BattleState): Promise<BattleResult> {
    while (state.status === 'ongoing') {
      state.turn++;
      
      // Scale boss at start of turn
      this.scaleBoss(state.boss);
      
      // Calculate turn order
      const turnOrder = this.calculateTurnOrder(state.team, state.boss);
      
      // Execute each combatant's turn
      for (const combatant of turnOrder) {
        if ('stats' in combatant) {
          // Stepling turn
          this.executeSteplingTurn(combatant, state);
        } else {
          // Boss turn
          this.executeBossTurn(state);
        }
        
        // Check win/loss conditions
        if (state.boss.currentHP <= 0) {
          state.status = 'victory';
          break;
        }
        if (this.allSteplingsDead(state.team)) {
          state.status = 'defeat';
          break;
        }
      }
      
      // Safety limit: max 1000 turns
      if (state.turn >= 1000) {
        state.status = 'defeat';
        break;
      }
    }
    
    // Calculate results
    const score = state.totalDamage;
    const gemsEarned = Math.floor(score / 100);
    
    return {
      victory: state.status === 'victory',
      turnsSurvived: state.turn,
      totalDamage: state.totalDamage,
      score,
      gemsEarned,
      battleLog: state.battleLog
    };
  }
  
  /**
   * Start a new battle
   */
  async startBattle(
    playerId: string,
    teamIds: string[],
    formation: BattleFormation,
    bossTier: number
  ): Promise<BattleState> {
    // Validate team size (1-10 steplings allowed)
    if (teamIds.length < 1 || teamIds.length > 10) {
      throw new Error('Team must have between 1 and 10 steplings');
    }
    
    // Validate formation positions match team size
    const totalPositions = formation.front.length + formation.middle.length + formation.back.length;
    if (totalPositions !== teamIds.length) {
      throw new Error(`Formation positions (${totalPositions}) must match team size (${teamIds.length})`);
    }
    
    // Fetch steplings from database
    const steplings = await db('steplings')
      .whereIn('id', teamIds)
      .where({ player_id: playerId });
    
    if (steplings.length !== 10) {
      throw new Error('Invalid team: some steplings not found or not owned by player');
    }
    
    // Convert to battle format
    const team: Stepling[] = steplings.map(s => ({
      id: s.id,
      name: s.species_name || 'Unknown',
      currentHP: s.current_stats.hp,
      maxHP: s.current_stats.hp,
      stats: {
        hp: s.current_stats.hp,
        attack: s.current_stats.attack,
        defense: s.current_stats.defense,
        speed: s.current_stats.speed,
        regen: s.current_stats.regen || 0,
        lifesteal: s.current_stats.lifesteal || 0
      }
    }));
    
    // Initialize boss
    const boss = this.initializeBoss(bossTier);
    
    // Create battle state
    const battleState: BattleState = {
      battleId: `battle_${Date.now()}_${playerId}`,
      playerId,
      boss,
      team,
      formation,
      turn: 0,
      totalDamage: 0,
      battleLog: [],
      status: 'ongoing'
    };
    
    return battleState;
  }
  
  /**
   * Save battle result to database
   */
  async saveBattleResult(playerId: string, bossTier: number, result: BattleResult): Promise<void> {
    const trx = await db.transaction();
    
    try {
      // Save battle result
      const [battleResult] = await trx('battle_results')
        .insert({
          player_id: playerId,
          boss_tier: bossTier,
          victory: result.victory,
          turns_survived: result.turnsSurvived,
          total_damage: result.totalDamage,
          score: result.score,
          gems_earned: result.gemsEarned,
          team_snapshot: {}, // TODO: Add team data
          battle_log: result.battleLog
        })
        .returning('*');
      
      // Award gems
      await trx('players')
        .where({ id: playerId })
        .increment('gems', result.gemsEarned);
      
      // Record gem transaction
      const player = await trx('players').where({ id: playerId }).first();
      await trx('gem_transactions').insert({
        player_id: playerId,
        amount: result.gemsEarned,
        source: 'battle',
        reference_id: battleResult.id,
        balance_after: player.gems
      });
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

export const battleService = new BattleService();

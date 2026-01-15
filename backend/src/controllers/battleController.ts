import { Request, Response } from 'express';
import { battleService } from '../services/battleService';
import { energyService } from '../services/energyService';

export class BattleController {
  /**
   * POST /api/battle/start
   * Start a new boss battle
   */
  async startBattle(req: Request, res: Response): Promise<void> {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { teamIds, formation, bossTier } = req.body;
      
      // Validate input
      if (!Array.isArray(teamIds) || teamIds.length !== 10) {
        res.status(400).json({ error: 'Team must have exactly 10 steplings' });
        return;
      }
      
      if (!formation || !formation.front || !formation.middle || !formation.back) {
        res.status(400).json({ error: 'Invalid formation' });
        return;
      }
      
      if (typeof bossTier !== 'number' || bossTier < 1 || bossTier > 5) {
        res.status(400).json({ error: 'Invalid boss tier (must be 1-5)' });
        return;
      }
      
      // Check energy
      const hasEnergy = await energyService.canStartBattle(playerId);
      if (!hasEnergy) {
        res.status(403).json({ 
          error: 'INSUFFICIENT_ENERGY',
          message: 'Not enough energy to start battle'
        });
        return;
      }
      
      // Consume energy
      const consumed = await energyService.consumeEnergy(playerId);
      if (!consumed) {
        res.status(403).json({ error: 'Failed to consume energy' });
        return;
      }
      
      // Start battle
      const battleState = await battleService.startBattle(playerId, teamIds, formation, bossTier);
      
      // Get remaining energy
      const energy = await energyService.getPlayerEnergy(playerId);
      
      res.json({
        battleId: battleState.battleId,
        initialState: battleState,
        energyRemaining: energy.current
      });
    } catch (error) {
      console.error('Error starting battle:', error);
      res.status(500).json({ error: 'Failed to start battle' });
    }
  }
  
  /**
   * POST /api/battle/simulate
   * Simulate a battle and return results
   */
  async simulateBattle(req: Request, res: Response): Promise<void> {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { battleState } = req.body;
      
      if (!battleState || battleState.playerId !== playerId) {
        res.status(400).json({ error: 'Invalid battle state' });
        return;
      }
      
      // Simulate battle
      const result = await battleService.simulateBattle(battleState);
      
      // Save result
      await battleService.saveBattleResult(playerId, battleState.boss.tier, result);
      
      res.json({ result });
    } catch (error) {
      console.error('Error simulating battle:', error);
      res.status(500).json({ error: 'Failed to simulate battle' });
    }
  }
  
  /**
   * GET /api/battle/progress
   * Get player's boss battle progress
   */
  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const playerId = req.user?.id;
      if (!playerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // TODO: Implement progress tracking
      res.json({
        maxTierUnlocked: 1,
        bestScores: {},
        totalBattles: 0,
        totalVictories: 0,
        totalGemsEarned: 0
      });
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({ error: 'Failed to get progress' });
    }
  }
}

export const battleController = new BattleController();

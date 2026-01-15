import { Request, Response } from 'express';
import { energyService } from '../services/energyService';

export class EnergyController {
  /**
   * GET /api/player/energy
   * Get player's current energy status
   */
  async getEnergy(req: Request, res: Response): Promise<void> {
    try {
      const playerId = req.user?.playerId || req.query.playerId as string;
      if (!playerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const energy = await energyService.getPlayerEnergy(playerId);
      const timeUntilNextRegen = await energyService.getTimeUntilNextRegen(playerId);
      
      res.json({
        current: energy.current,
        max: energy.max,
        timeUntilNextRegen,
        lastRegenTime: energy.lastRegenTime
      });
    } catch (error) {
      console.error('Error getting energy:', error);
      res.status(500).json({ error: 'Failed to get energy' });
    }
  }
  
  /**
   * POST /api/player/energy/update
   * Update energy based on steps and time
   */
  async updateEnergy(req: Request, res: Response): Promise<void> {
    try {
      const playerId = req.user?.playerId || req.body.playerId;
      if (!playerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { currentSteps } = req.body;
      
      if (typeof currentSteps !== 'number' || currentSteps < 0) {
        res.status(400).json({ error: 'Valid currentSteps required' });
        return;
      }
      
      const result = await energyService.updateEnergy(playerId, currentSteps);
      
      res.json(result);
    } catch (error) {
      console.error('Error updating energy:', error);
      res.status(500).json({ error: 'Failed to update energy' });
    }
  }
}

export const energyController = new EnergyController();

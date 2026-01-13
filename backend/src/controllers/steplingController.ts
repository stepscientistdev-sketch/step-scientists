import { Request, Response } from 'express';
import { steplingService } from '../services/steplingService';
import { AuthenticatedRequest } from '../middleware/auth';

export const steplingController = {
  // Get all steplings for a player
  async getSteplings(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      const steplings = await steplingService.getPlayerSteplings(playerId);
      res.json({ success: true, data: steplings });
    } catch (error) {
      console.error('Error getting steplings:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve steplings' } 
      });
    }
  },

  // Get a specific stepling
  async getStepling(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const { steplingId } = req.params;

      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      const stepling = await steplingService.getStepling(steplingId, playerId);
      if (!stepling) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'NOT_FOUND', message: 'Stepling not found' } 
        });
      }

      res.json({ success: true, data: stepling });
    } catch (error) {
      console.error('Error getting stepling:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve stepling' } 
      });
    }
  },

  // Create a new stepling (used when discovering species)
  async createStepling(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const { speciesId } = req.body;

      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      if (!speciesId) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'INVALID_INPUT', message: 'Species ID is required' } 
        });
      }

      const stepling = await steplingService.createStepling(playerId, speciesId);
      res.status(201).json({ success: true, data: stepling });
    } catch (error) {
      console.error('Error creating stepling:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create stepling' } 
      });
    }
  },

  // Update a stepling (level up)
  async updateStepling(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const { steplingId } = req.params;
      const updateData = req.body;

      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      const updatedStepling = await steplingService.updateStepling(steplingId, playerId, updateData);
      if (!updatedStepling) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'NOT_FOUND', message: 'Stepling not found' } 
        });
      }

      res.json({ success: true, data: updatedStepling });
    } catch (error) {
      console.error('Error updating stepling:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update stepling' } 
      });
    }
  },

  // Fuse two steplings
  async fuseSteplings(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const { newStepling, removedSteplingIds } = req.body;

      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      if (!newStepling || !removedSteplingIds || removedSteplingIds.length !== 2) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'INVALID_INPUT', message: 'Invalid fusion data' } 
        });
      }

      const result = await steplingService.processFusion(playerId, newStepling, removedSteplingIds);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error processing fusion:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process fusion' } 
      });
    }
  },

  // Get fusion candidates for a stepling
  async getFusionCandidates(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const { steplingId } = req.params;

      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      const candidates = await steplingService.getFusionCandidates(steplingId, playerId);
      res.json({ success: true, data: candidates });
    } catch (error) {
      console.error('Error getting fusion candidates:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get fusion candidates' } 
      });
    }
  },

  // Level up a stepling with experience points
  async levelUpStepling(req: AuthenticatedRequest, res: Response) {
    try {
      const playerId = req.user?.playerId;
      const { steplingId } = req.params;
      const { experiencePoints } = req.body;

      if (!playerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Player not authenticated' } });
      }

      if (!experiencePoints || experiencePoints <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'INVALID_INPUT', message: 'Valid experience points required' } 
        });
      }

      const result = await steplingService.levelUpStepling(steplingId, playerId, experiencePoints);
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'LEVEL_UP_FAILED', message: result.error } 
        });
      }

      res.json({ success: true, data: result.stepling });
    } catch (error) {
      console.error('Error leveling up stepling:', error);
      res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'Failed to level up stepling' } 
      });
    }
  }
};
import express from 'express';
import {lifetimeAchievementController} from '../controllers/lifetimeAchievementController';
import {authenticateToken, AuthenticatedRequest} from '../middleware/auth';

const router = express.Router();

// Get lifetime achievements for authenticated player
router.get('/', authenticateToken, (req, res) => 
  lifetimeAchievementController.getAchievements(req as AuthenticatedRequest, res)
);

// Update achievements based on total steps
router.post('/update', authenticateToken, (req, res) =>
  lifetimeAchievementController.updateAchievements(req as AuthenticatedRequest, res)
);

// Claim daily bonus cells
router.post('/claim-daily', authenticateToken, (req, res) =>
  lifetimeAchievementController.claimDailyBonus(req as AuthenticatedRequest, res)
);

export default router;

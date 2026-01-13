import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All game routes require authentication
router.use(authenticateToken);

// Get game data
router.get('/data', (req, res) => {
  res.json({
    success: true,
    message: 'Game routes - to be implemented',
  });
});

export default router;
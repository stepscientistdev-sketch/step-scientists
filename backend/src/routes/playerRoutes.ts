import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All player routes require authentication
router.use(authenticateToken);

// Get player profile
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Player routes - to be implemented',
  });
});

export default router;
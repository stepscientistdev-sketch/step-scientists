import express from 'express';
import { steplingController } from '../controllers/steplingController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All stepling routes require authentication
router.use(authenticateToken);

// Get all steplings for the authenticated player
router.get('/', steplingController.getSteplings);

// Get a specific stepling
router.get('/:steplingId', steplingController.getStepling);

// Create a new stepling (used when discovering species)
router.post('/', steplingController.createStepling);

// Update a stepling
router.put('/:steplingId', steplingController.updateStepling);

// Fusion endpoint
router.post('/fusion', steplingController.fuseSteplings);

// Get fusion candidates for a stepling
router.get('/:steplingId/fusion-candidates', steplingController.getFusionCandidates);

// Level up a stepling with experience points
router.post('/:steplingId/level-up', steplingController.levelUpStepling);

export default router;
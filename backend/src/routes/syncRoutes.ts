import { Router } from 'express';
import { syncController } from '../controllers/syncController';
import { authenticateToken } from '../middleware/auth';
import { validateSyncRequest } from '../middleware/validateSyncRequest';

const router = Router();

// All sync routes require authentication
router.use(authenticateToken);

// Sync player data
router.post('/player-data', validateSyncRequest, syncController.syncPlayerData);

// Resolve conflict
router.post('/resolve-conflict', syncController.resolveConflict);

// Get sync status
router.get('/status/:playerId', syncController.getSyncStatus);

// Rollback transaction
router.post('/rollback/:transactionId', syncController.rollbackTransaction);

// Get conflict history
router.get('/conflicts/:playerId', syncController.getConflictHistory);

export default router;
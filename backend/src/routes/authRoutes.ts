import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// POST /api/auth/register
router.post('/register', authController.register.bind(authController));

// POST /api/auth/login
router.post('/login', authController.login.bind(authController));

// POST /api/auth/refresh
router.post('/refresh', authController.refreshToken.bind(authController));

// POST /api/auth/logout
router.post('/logout', authController.logout.bind(authController));

export default router;
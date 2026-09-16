import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public auth routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Protected auth routes
router.get('/me', requireAuth, AuthController.getProfile);

export default router;

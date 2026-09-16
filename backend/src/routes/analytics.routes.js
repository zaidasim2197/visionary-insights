import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/analytics/summary (Admin, Manager, Viewer)
router.get('/summary', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), AnalyticsController.getSummary);

export default router;

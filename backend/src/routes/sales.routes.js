import { Router } from 'express';
import { SalesController } from '../controllers/salesController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/sales/summary (Admin, Manager, Viewer)
router.get('/summary', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), SalesController.getSummary);

// GET /api/v1/sales/drilldown (Admin, Manager, Viewer)
router.get('/drilldown', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), SalesController.getDrilldown);

export default router;

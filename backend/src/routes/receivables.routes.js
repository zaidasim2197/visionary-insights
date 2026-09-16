import { Router } from 'express';
import { ReceivablesController } from '../controllers/receivablesController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/receivables/summary (Admin, Manager, Viewer)
router.get('/summary', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), ReceivablesController.getSummary);

// GET /api/v1/receivables/drilldown (Admin, Manager, Viewer)
router.get('/drilldown', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), ReceivablesController.getDrilldown);

export default router;

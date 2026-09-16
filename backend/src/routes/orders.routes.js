import { Router } from 'express';
import { OrdersController } from '../controllers/ordersController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/orders/summary (Admin, Manager, Viewer)
router.get('/summary', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), OrdersController.getSummary);

// GET /api/v1/orders/drilldown (Admin, Manager, Viewer)
router.get('/drilldown', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), OrdersController.getDrilldown);

export default router;

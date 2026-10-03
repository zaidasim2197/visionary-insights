import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/inventory/summary (Admin, Manager, Viewer - Viewer receives sanitized counts without totalStockValue)
router.get('/summary', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), InventoryController.getSummary);

// GET /api/v1/inventory/drilldown (Admin, Manager ONLY per Section 6)
router.get('/drilldown', requireRole('Admin', 'Manager'), cacheMiddleware(), InventoryController.getDrilldown);

export default router;

import { Router } from 'express';
import { ImportController } from '../controllers/importController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

router.use(requireAuth);

// POST /api/v1/import/orders (Admin, Manager only; Viewer forbidden 403)
router.post('/orders', requireRole('Admin', 'Manager'), ImportController.importOrders);

export default router;

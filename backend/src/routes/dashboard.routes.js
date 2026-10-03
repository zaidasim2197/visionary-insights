import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

// Authentication required on all Section 5 endpoints
router.use(requireAuth);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Section 5 & 6 API Contract:
 * All roles (Admin, Manager, Viewer):
 *   - /kpis/sales
 *   - /trends/sales
 *   - /kpis/orders
 *   - /trends/orders
 *   - /kpis/inventory/counts
 *   - /trends/inventory
 *
 * Restricted (Admin & Manager ONLY - Viewer receives 403 Forbidden):
 *   - All drill-downs (/orders, /orders/:id, /inventory/lowstock, /inventory/outofstock, etc.)
 *   - Inventory Value (/kpis/inventory/value)
 *   - All Receivables (/kpis/receivables, /receivables/*)
 *   - All Rankings (/rankings/*)
 *   - All Operational KPIs and trends (/kpis/operational, /trends/operational, /operational/*)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// 1. Sales
router.get('/kpis/sales', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), DashboardController.getSalesKpis);
router.get('/trends/sales', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), DashboardController.getSalesTrends);

// 2. Orders
router.get('/kpis/orders', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), DashboardController.getOrdersKpis);
router.get('/trends/orders', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), DashboardController.getOrdersTrends);
router.get('/orders', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getOrders);
router.get('/orders/:id', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getOrderById);

// 3. Inventory
router.get('/kpis/inventory/counts', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), DashboardController.getInventoryCounts);
router.get('/kpis/inventory/value', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getInventoryValue);
router.get('/inventory/lowstock', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getInventoryLowStock);
router.get('/inventory/outofstock', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getInventoryOutOfStock);
router.get('/trends/inventory', requireRole('Admin', 'Manager', 'Viewer'), cacheMiddleware(), DashboardController.getInventoryTrends);

// 4. Receivables
router.get('/kpis/receivables', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReceivablesKpis);
router.get('/receivables/aging', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReceivablesAging);
router.get('/receivables/outstanding', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReceivablesOutstanding);
router.get('/receivables/overdue', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReceivablesOverdue);
router.get('/receivables/:id', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReceivableById);
router.get('/trends/receivables', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReceivablesTrends);

// 5. Rankings
router.get('/rankings/products', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getRankingsProducts);
router.get('/rankings/customers', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getRankingsCustomers);

// 6. Operational
router.get('/kpis/operational', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getOperationalKpis);
router.get('/trends/operational', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getOperationalTrends);
router.get('/operational/fulfillment-time/drilldown', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getFulfillmentTimeDrilldown);
router.get('/operational/returns/drilldown', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getReturnsDrilldown);
router.get('/operational/repeat-customers/drilldown', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getRepeatCustomersDrilldown);
router.get('/operational/inventory-turnover/drilldown', requireRole('Admin', 'Manager'), cacheMiddleware(), DashboardController.getInventoryTurnoverDrilldown);

export default router;

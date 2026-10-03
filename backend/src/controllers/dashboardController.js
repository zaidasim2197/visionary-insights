import { DashboardApiService } from '../services/dashboardApiService.js';

export class DashboardController {
  // 1. GET /api/dashboard/kpis/sales
  static async getSalesKpis(req, res, next) {
    try {
      const { from, to } = req.query;
      const result = await DashboardApiService.getSalesKpis({ from, to });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. GET /api/dashboard/trends/sales
  static async getSalesTrends(req, res, next) {
    try {
      const { from, to, granularity } = req.query;
      const result = await DashboardApiService.getSalesTrends({ from, to, granularity });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. GET /api/dashboard/kpis/orders
  static async getOrdersKpis(req, res, next) {
    try {
      const { from, to } = req.query;
      const result = await DashboardApiService.getOrdersKpis({ from, to });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. GET /api/dashboard/orders
  static async getOrders(req, res, next) {
    try {
      const { status, customer, from, to, page, limit } = req.query;
      const result = await DashboardApiService.getOrdersDrilldown({ status, customer, from, to, page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. GET /api/dashboard/orders/:id
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await DashboardApiService.getOrderById(id);
      if (!result) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Order '${id}' not found.` } });
      }
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. GET /api/dashboard/kpis/inventory/counts
  static async getInventoryCounts(req, res, next) {
    try {
      const result = await DashboardApiService.getInventoryCounts();
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. GET /api/dashboard/kpis/inventory/value
  static async getInventoryValue(req, res, next) {
    try {
      const result = await DashboardApiService.getInventoryValue();
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. GET /api/dashboard/inventory/lowstock
  static async getInventoryLowStock(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await DashboardApiService.getInventoryLowStock({ page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 9. GET /api/dashboard/kpis/receivables
  static async getReceivablesKpis(req, res, next) {
    try {
      const { from, to } = req.query;
      const result = await DashboardApiService.getReceivablesKpis({ from, to });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. GET /api/dashboard/receivables/aging
  static async getReceivablesAging(req, res, next) {
    try {
      const result = await DashboardApiService.getReceivablesAging();
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. GET /api/dashboard/receivables/:id
  static async getReceivableById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await DashboardApiService.getReceivableById(id);
      if (!result) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Invoice '${id}' not found.` } });
      }
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 12. GET /api/dashboard/rankings/products
  static async getRankingsProducts(req, res, next) {
    try {
      const { from, to, limit } = req.query;
      const result = await DashboardApiService.getRankingsProducts({ from, to, limit });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 13. GET /api/dashboard/rankings/customers
  static async getRankingsCustomers(req, res, next) {
    try {
      const { from, to, limit } = req.query;
      const result = await DashboardApiService.getRankingsCustomers({ from, to, limit });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 14. GET /api/dashboard/kpis/operational
  static async getOperationalKpis(req, res, next) {
    try {
      const { from, to } = req.query;
      const result = await DashboardApiService.getOperationalKpis({ from, to });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 15. GET /api/dashboard/inventory/outofstock
  static async getInventoryOutOfStock(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await DashboardApiService.getInventoryOutOfStock({ page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 16. GET /api/dashboard/trends/orders
  static async getOrdersTrends(req, res, next) {
    try {
      const { from, to, granularity } = req.query;
      const result = await DashboardApiService.getOrdersTrends({ from, to, granularity });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 17. GET /api/dashboard/receivables/outstanding
  static async getReceivablesOutstanding(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await DashboardApiService.getReceivablesOutstanding({ page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 18. GET /api/dashboard/receivables/overdue
  static async getReceivablesOverdue(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await DashboardApiService.getReceivablesOverdue({ page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 19. GET /api/dashboard/trends/receivables
  static async getReceivablesTrends(req, res, next) {
    try {
      const { from, to, granularity } = req.query;
      const result = await DashboardApiService.getReceivablesTrends({ from, to, granularity });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 20. GET /api/dashboard/operational/fulfillment-time/drilldown
  static async getFulfillmentTimeDrilldown(req, res, next) {
    try {
      const { from, to, page, limit } = req.query;
      const result = await DashboardApiService.getFulfillmentTimeDrilldown({ from, to, page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 21. GET /api/dashboard/operational/returns/drilldown
  static async getReturnsDrilldown(req, res, next) {
    try {
      const { from, to, page, limit } = req.query;
      const result = await DashboardApiService.getReturnsDrilldown({ from, to, page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 22. GET /api/dashboard/operational/repeat-customers/drilldown
  static async getRepeatCustomersDrilldown(req, res, next) {
    try {
      const { from, to, page, limit } = req.query;
      const result = await DashboardApiService.getRepeatCustomersDrilldown({ from, to, page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 23. GET /api/dashboard/trends/operational
  static async getOperationalTrends(req, res, next) {
    try {
      const { from, to, granularity } = req.query;
      const result = await DashboardApiService.getOperationalTrends({ from, to, granularity });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 24. GET /api/dashboard/operational/inventory-turnover/drilldown
  static async getInventoryTurnoverDrilldown(req, res, next) {
    try {
      const { from, to, page, limit } = req.query;
      const result = await DashboardApiService.getInventoryTurnoverDrilldown({ from, to, page, limit });
      return res.status(200).json({
        data: result.data,
        meta: result.meta,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // 25. GET /api/dashboard/trends/inventory
  static async getInventoryTrends(req, res, next) {
    try {
      const { from, to, granularity } = req.query;
      const result = await DashboardApiService.getInventoryTrends({ from, to, granularity });
      return res.status(200).json({
        data: result.data,
        recordCount: result.recordCount,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
}

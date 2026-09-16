import { InventoryService } from '../services/inventoryService.js';

export class InventoryController {
  static async getSummary(req, res, next) {
    try {
      const { preset, from, to } = req.query;
      const result = await InventoryService.getSummary({ preset, from, to });
      return res.status(200).json({
        data: result,
        recordCount: 1,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDrilldown(req, res, next) {
    try {
      const { page, limit, status, category, search } = req.query;
      const result = await InventoryService.getDrilldown({ page, limit, status, category, search });
      return res.status(200).json({
        ...result,
        recordCount: result.data.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

import { OrdersService } from '../services/ordersService.js';

export class OrdersController {
  static async getSummary(req, res, next) {
    try {
      const { preset, from, to } = req.query;
      const result = await OrdersService.getSummary({ preset, from, to });
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
      const { preset, from, to, status, page, limit, search } = req.query;
      const result = await OrdersService.getDrilldown({ preset, from, to, status, page, limit, search });
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

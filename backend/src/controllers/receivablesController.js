import { ReceivablesService } from '../services/receivablesService.js';

export class ReceivablesController {
  static async getSummary(req, res, next) {
    try {
      const { preset, from, to } = req.query;
      const result = await ReceivablesService.getSummary({ preset, from, to });
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
      const { status, isOverdue, page, limit, search } = req.query;
      const result = await ReceivablesService.getDrilldown({ status, isOverdue, page, limit, search });
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

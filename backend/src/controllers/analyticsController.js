import { AnalyticsService } from '../services/analyticsService.js';

export class AnalyticsController {
  static async getSummary(req, res, next) {
    try {
      const { preset, from, to } = req.query;
      const result = await AnalyticsService.getSummary({ preset, from, to });
      return res.status(200).json({
        data: result,
        recordCount: 1,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

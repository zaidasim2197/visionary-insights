import { AnalyticsRepository } from '../repositories/analyticsRepository.js';
import { resolveDateRange } from '../utils/dateUtils.js';

export class AnalyticsService {
  static async getSummary({ preset = 'month', from = null, to = null } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });

    const [topProducts, topCustomers, regionalSales, operational] = await Promise.all([
      AnalyticsRepository.getTopProducts(fromDate, toDate, 5),
      AnalyticsRepository.getTopCustomers(fromDate, toDate, 5),
      AnalyticsRepository.getRegionalSales(fromDate, toDate),
      AnalyticsRepository.getOperationalMetrics(fromDate, toDate)
    ]);

    return {
      period: {
        preset: resolvedPreset,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      },
      topProducts,
      topCustomers,
      regionalSales,
      operational
    };
  }
}

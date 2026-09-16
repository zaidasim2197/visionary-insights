import { SalesRepository } from '../repositories/salesRepository.js';
import { resolveDateRange, getPreviousPeriod } from '../utils/dateUtils.js';

export class SalesService {
  /**
   * Calculates Sales Summary KPIs with growth comparison
   */
  static async getSummary({ preset = 'month', from = null, to = null } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });
    const { prevFromDate, prevToDate } = getPreviousPeriod(fromDate, toDate);

    const [currentMetrics, previousMetrics] = await Promise.all([
      SalesRepository.getSalesMetrics(fromDate, toDate),
      SalesRepository.getSalesMetrics(prevFromDate, prevToDate)
    ]);

    // Sales Growth Rate calculation with division-by-zero protection
    let salesGrowthPercent = 0;
    if (previousMetrics.totalSales > 0) {
      salesGrowthPercent = Number(
        (((currentMetrics.totalSales - previousMetrics.totalSales) / previousMetrics.totalSales) * 100).toFixed(2)
      );
    } else if (currentMetrics.totalSales > 0) {
      salesGrowthPercent = 100.0;
    }

    let ordersGrowthPercent = 0;
    if (previousMetrics.totalOrders > 0) {
      ordersGrowthPercent = Number(
        (((currentMetrics.totalOrders - previousMetrics.totalOrders) / previousMetrics.totalOrders) * 100).toFixed(2)
      );
    } else if (currentMetrics.totalOrders > 0) {
      ordersGrowthPercent = 100.0;
    }

    return {
      period: {
        preset: resolvedPreset,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      },
      current: {
        totalSales: currentMetrics.totalSales,
        totalOrders: currentMetrics.totalOrders,
        averageOrderValue: currentMetrics.averageOrderValue
      },
      previous: {
        totalSales: previousMetrics.totalSales,
        totalOrders: previousMetrics.totalOrders,
        averageOrderValue: previousMetrics.averageOrderValue
      },
      growth: {
        salesGrowthPercent,
        ordersGrowthPercent
      }
    };
  }

  /**
   * Fetches paginated sales drilldown records
   */
  static async getDrilldown({ preset = 'month', from = null, to = null, page = 1, limit = 25, search = '' } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });
    const drilldown = await SalesRepository.getSalesDrilldown(fromDate, toDate, {
      page: Number(page),
      limit: Number(limit),
      search
    });

    return {
      period: {
        preset: resolvedPreset,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      },
      ...drilldown
    };
  }
}

import { OrdersRepository } from '../repositories/ordersRepository.js';
import { resolveDateRange } from '../utils/dateUtils.js';

export class OrdersService {
  static async getSummary({ preset = 'month', from = null, to = null } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });
    const metrics = await OrdersRepository.getOrdersMetrics(fromDate, toDate);

    return {
      period: {
        preset: resolvedPreset,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      },
      ...metrics
    };
  }

  static async getDrilldown({ preset = 'month', from = null, to = null, status = null, page = 1, limit = 25, search = '' } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });
    const drilldown = await OrdersRepository.getOrdersDrilldown(fromDate, toDate, {
      status,
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

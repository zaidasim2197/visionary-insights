import { ReceivablesRepository } from '../repositories/receivablesRepository.js';
import { resolveDateRange } from '../utils/dateUtils.js';

export class ReceivablesService {
  static async getSummary({ preset = 'month', from = null, to = null } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });
    const metrics = await ReceivablesRepository.getReceivablesMetrics(fromDate, toDate);

    return {
      snapshotTime: new Date().toISOString(),
      liveSnapshot: {
        totalOutstanding: metrics.totalOutstanding,
        overdueAmount: metrics.overdueAmount,
        overdueInvoicesCount: metrics.overdueInvoicesCount
      },
      periodPaidMetrics: {
        period: {
          preset: resolvedPreset,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        },
        paidInvoicesCount: metrics.paidInvoicesCount,
        avgDaysToPay: metrics.avgDaysToPay
      }
    };
  }

  static async getDrilldown({ status = 'ALL', isOverdue = null, page = 1, limit = 25, search = '' } = {}) {
    const drilldown = await ReceivablesRepository.getReceivablesDrilldown({
      status,
      isOverdue: isOverdue === 'true' || isOverdue === true,
      page: Number(page),
      limit: Number(limit),
      search
    });

    return {
      snapshotTime: new Date().toISOString(),
      ...drilldown
    };
  }
}

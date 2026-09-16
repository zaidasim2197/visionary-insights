import { InventoryRepository } from '../repositories/inventoryRepository.js';
import { resolveDateRange } from '../utils/dateUtils.js';

export class InventoryService {
  /**
   * Calculates live inventory snapshot metrics and period turnover
   */
  static async getSummary({ preset = 'month', from = null, to = null } = {}) {
    const { fromDate, toDate, preset: resolvedPreset } = resolveDateRange({ preset, from, to });

    const [liveSnapshot, periodCOGS] = await Promise.all([
      InventoryRepository.getLiveInventoryMetrics(),
      InventoryRepository.getPeriodCOGS(fromDate, toDate)
    ]);

    // Inventory turnover calculation with zero-division guard
    // Formula: COGS for period / Live Inventory Stock Value
    let inventoryTurnoverRate = 0;
    if (liveSnapshot.totalStockValue > 0) {
      inventoryTurnoverRate = Number((periodCOGS / liveSnapshot.totalStockValue).toFixed(2));
    }

    return {
      snapshotTime: new Date().toISOString(),
      liveSnapshot: {
        totalStockValue: liveSnapshot.totalStockValue,
        totalActiveProducts: liveSnapshot.totalActiveProducts,
        lowStockCount: liveSnapshot.lowStockCount,
        outOfStockCount: liveSnapshot.outOfStockCount
      },
      periodTurnover: {
        period: {
          preset: resolvedPreset,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        },
        cogs: periodCOGS,
        inventoryTurnoverRate
      }
    };
  }

  static async getDrilldown({ page = 1, limit = 25, status = 'ALL', category = 'ALL', search = '' } = {}) {
    const drilldown = await InventoryRepository.getInventoryDrilldown({
      page: Number(page),
      limit: Number(limit),
      status,
      category,
      search
    });

    return {
      snapshotTime: new Date().toISOString(),
      ...drilldown
    };
  }
}

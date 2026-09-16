import mongoose from 'mongoose';
import { InventoryPosition } from '../models/InventoryPosition.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Product } from '../models/Product.js';
import { OrderLine } from '../models/OrderLine.js';
import { CustomerOrder } from '../models/CustomerOrder.js';
import { dateRangeFilter, excludeCancelled } from '../utils/dateUtils.js';

export class InventoryRepository {
  /**
   * Live snapshot of inventory positions (ignores date filters per specification)
   */
  static async getLiveInventoryMetrics() {
    const pipeline = [
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      {
        $project: {
          _id: 1,
          productId: 1,
          currentStock: 1,
          availableStock: 1,
          reorderThreshold: '$product.reorderThreshold',
          stockValue: { $multiply: ['$currentStock', '$product.unitCost'] },
          isLowStock: {
            $and: [
              { $gt: ['$availableStock', 0] },
              { $lte: ['$availableStock', '$product.reorderThreshold'] }
            ]
          },
          isOutOfStock: { $lte: ['$availableStock', 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalStockValue: { $sum: '$stockValue' },
          totalActiveProducts: { $sum: 1 },
          lowStockCount: { $sum: { $cond: ['$isLowStock', 1, 0] } },
          outOfStockCount: { $sum: { $cond: ['$isOutOfStock', 1, 0] } }
        }
      }
    ];

    const result = await InventoryPosition.aggregate(pipeline);
    return {
      totalStockValue: result[0]?.totalStockValue || 0,
      totalActiveProducts: result[0]?.totalActiveProducts || 0,
      lowStockCount: result[0]?.lowStockCount || 0,
      outOfStockCount: result[0]?.outOfStockCount || 0
    };
  }

  /**
   * Calculates COGS (Cost of Goods Sold) for a period to calculate Inventory Turnover
   */
  static async getPeriodCOGS(fromDate, toDate) {
    const ordersMatch = {
      ...excludeCancelled,
      ...dateRangeFilter('orderDate', fromDate, toDate)
    };

    const validOrders = await CustomerOrder.find(ordersMatch, { _id: 1 }).lean();
    const orderIds = validOrders.map((o) => o._id);

    if (orderIds.length === 0) return 0;

    const cogsResult = await OrderLine.aggregate([
      { $match: { orderId: { $in: orderIds }, isReturn: false } },
      {
        $group: {
          _id: null,
          totalCOGS: { $sum: { $multiply: ['$quantity', '$unitCostAtSale'] } }
        }
      }
    ]);

    return cogsResult[0]?.totalCOGS || 0;
  }

  /**
   * Inventory Positions Drilldown list with live stock statuses
   */
  static async getInventoryDrilldown({ page = 1, limit = 25, status = 'ALL', category = 'ALL', search = '' } = {}) {
    const basePipeline = [
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } }
    ];

    if (category && category !== 'ALL') {
      basePipeline.push({ $match: { 'product.category': category } });
    }

    basePipeline.push({
      $addFields: {
        stockStatus: {
          $cond: [
            { $lte: ['$availableStock', 0] },
            'Out of Stock',
            {
              $cond: [
                { $lte: ['$availableStock', '$product.reorderThreshold'] },
                'Low Stock',
                'In Stock'
              ]
            }
          ]
        },
        calculatedStockValue: { $multiply: ['$currentStock', '$product.unitCost'] }
      }
    });

    if (status && status !== 'ALL') {
      basePipeline.push({ $match: { stockStatus: status } });
    }

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      basePipeline.push({
        $match: {
          $or: [
            { 'product.name': regex },
            { 'product.productCode': regex }
          ]
        }
      });
    }

    const countPipeline = [...basePipeline, { $count: 'total' }];
    const countResult = await InventoryPosition.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 0;
    const skip = (page - 1) * limit;

    const dataPipeline = [
      ...basePipeline,
      { $sort: { availableStock: 1, 'product.name': 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          id: '$_id',
          productId: 1,
          productCode: '$product.productCode',
          productName: '$product.name',
          category: '$product.category',
          unitCost: '$product.unitCost',
          unitPrice: '$product.unitPrice',
          reorderThreshold: '$product.reorderThreshold',
          currentStock: 1,
          reservedStock: 1,
          availableStock: 1,
          stockValue: '$calculatedStockValue',
          stockStatus: 1,
          lastUpdated: 1
        }
      }
    ];

    const data = await InventoryPosition.aggregate(dataPipeline);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }
}

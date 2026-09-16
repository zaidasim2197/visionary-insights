import { ImportValidator } from '../validators/importValidator.js';
import { CustomerOrder } from '../models/CustomerOrder.js';
import { OrderLine } from '../models/OrderLine.js';
import { Receivable } from '../models/Receivable.js';
import { InventoryTransactionService } from '../services/inventoryTransactionService.js';
import { invalidateCache } from '../middleware/cache.js';

export class ImportController {
  /**
   * POST /api/v1/import/orders
   * Validates and imports arbitrary batch rows
   */
  static async importOrders(req, res, next) {
    try {
      const rows = Array.isArray(req.body) ? req.body : req.body.rows || [];
      if (rows.length === 0) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No import rows provided in request body.'
          },
          generatedAt: new Date().toISOString()
        });
      }

      const report = await ImportValidator.validateOrderBatch(rows);

      // Process accepted records
      for (const rec of report.acceptedRecords) {
        // 1. Create order
        const order = new CustomerOrder({
          orderNumber: rec.invoiceNumber,
          customerId: rec.customerId,
          orderDate: rec.orderDate,
          status: rec.isReturn ? 'Returned' : 'Delivered',
          fulfillmentDate: rec.orderDate
        });
        await order.save();

        // 2. Create order line
        const lineTotal = rec.quantity * rec.unitPrice;
        const line = new OrderLine({
          orderId: order._id,
          productId: rec.productId,
          quantity: rec.quantity,
          unitPriceAtSale: rec.unitPrice,
          unitCostAtSale: rec.unitCost,
          lineTotal,
          isReturn: rec.isReturn
        });
        await line.save();

        // 3. Record Inventory Movement & update position
        await InventoryTransactionService.recordMovement({
          productId: rec.productId,
          movementType: rec.isReturn ? 'Return' : 'Stock Out',
          quantityChange: rec.isReturn ? Math.abs(rec.quantity) : -Math.abs(rec.quantity),
          movementDate: rec.orderDate,
          referenceOrderLineId: line._id,
          notes: `Batch Import invoice: ${rec.invoiceNumber}`
        });

        // 4. Create Receivable
        const dueDate = new Date(rec.orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const receivable = new Receivable({
          orderId: order._id,
          customerId: rec.customerId,
          invoiceNumber: rec.invoiceNumber,
          invoiceDate: rec.orderDate,
          dueDate,
          amountTotal: Math.abs(lineTotal),
          amountPaid: rec.isReturn ? Math.abs(lineTotal) : 0,
          amountOutstanding: rec.isReturn ? 0 : Math.abs(lineTotal),
          status: rec.isReturn ? 'Paid' : 'Unpaid'
        });
        await receivable.save();
      }

      // Explicitly invalidate cache on import per Section 5
      invalidateCache();

      return res.status(report.rejectedCount > 0 ? 207 : 200).json({
        data: {
          totalProcessed: report.totalProcessed,
          acceptedCount: report.acceptedCount,
          rejectedCount: report.rejectedCount,
          rejectedRecords: report.rejectedRecords
        },
        recordCount: report.acceptedCount,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

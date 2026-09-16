import mongoose from 'mongoose';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { InventoryPosition } from '../models/InventoryPosition.js';
import { Product } from '../models/Product.js';

export class InventoryTransactionService {
  /**
   * Records an inventory movement and atomically updates the InventoryPosition snapshot.
   */
  static async recordMovement({
    productId,
    movementType,
    quantityChange,
    movementDate = new Date(),
    referenceOrderLineId = null,
    notes = '',
    performedBy = 'System'
  }) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found for inventory movement`);
    }

    const movement = new InventoryMovement({
      productId,
      movementType,
      quantityChange,
      movementDate,
      referenceOrderLineId,
      notes,
      performedBy
    });

    await movement.save();

    // Atomic upsert on InventoryPosition to guarantee zero drift
    const pos = await InventoryPosition.findOne({ productId });
    const currentStock = (pos?.currentStock || 0) + quantityChange;
    const reservedStock = pos?.reservedStock || 0;
    const availableStock = currentStock - reservedStock;
    const stockValue = currentStock * product.unitCost;

    const updatedPosition = await InventoryPosition.findOneAndUpdate(
      { productId },
      {
        $set: {
          currentStock,
          reservedStock,
          availableStock,
          stockValue,
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return { movement, position: updatedPosition };
  }

  /**
   * Re-synchronizes InventoryPosition snapshot from complete movement history if ever requested
   */
  static async recalculatePosition(productId) {
    const product = await Product.findById(productId);
    if (!product) return null;

    const result = await InventoryMovement.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: '$productId', totalQty: { $sum: '$quantityChange' } } }
    ]);

    const totalQty = result[0]?.totalQty || 0;
    const stockValue = totalQty * product.unitCost;

    return await InventoryPosition.findOneAndUpdate(
      { productId },
      {
        $set: {
          currentStock: totalQty,
          availableStock: totalQty,
          stockValue,
          lastUpdated: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }
}

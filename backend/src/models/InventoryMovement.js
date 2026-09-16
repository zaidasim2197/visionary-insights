import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    movementType: {
      type: String,
      enum: ['Stock In', 'Stock Out', 'Adjustment', 'Return'],
      required: true
    },
    quantityChange: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for quantityChange'
      }
    },
    movementDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    referenceOrderLineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderLine',
      default: null
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    performedBy: {
      type: String,
      default: 'System',
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.productId) ret.productId = ret.productId.toString();
        if (ret.referenceOrderLineId) ret.referenceOrderLineId = ret.referenceOrderLineId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes per Section 7
inventoryMovementSchema.index({ productId: 1, movementDate: 1 });
inventoryMovementSchema.index({ movementType: 1, movementDate: -1 });

export const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);

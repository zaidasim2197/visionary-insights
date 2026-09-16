import mongoose from 'mongoose';

const inventoryPositionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for currentStock'
      }
    },
    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for reservedStock'
      }
    },
    availableStock: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for availableStock'
      }
    },
    stockValue: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for stockValue'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.productId) ret.productId = ret.productId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes per Section 7
inventoryPositionSchema.index({ availableStock: 1 });

export const InventoryPosition = mongoose.model('InventoryPosition', inventoryPositionSchema);

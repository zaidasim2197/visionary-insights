import mongoose from 'mongoose';

const orderLineSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerOrder',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for quantity'
      }
    },
    unitPriceAtSale: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for unitPriceAtSale'
      }
    },
    unitCostAtSale: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for unitCostAtSale'
      }
    },
    lineTotal: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for lineTotal'
      }
    },
    isReturn: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.orderId) ret.orderId = ret.orderId.toString();
        if (ret.productId) ret.productId = ret.productId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes per Section 7
orderLineSchema.index({ orderId: 1, productId: 1 });
orderLineSchema.index({ productId: 1, isReturn: 1 });

export const OrderLine = mongoose.model('OrderLine', orderLineSchema);

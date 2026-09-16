import mongoose from 'mongoose';

const customerOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
      required: true,
      default: 'Pending'
    },
    fulfillmentDate: {
      type: Date,
      default: null
    },
    paymentTerms: {
      type: String,
      default: 'Net 30'
    },
    currency: {
      type: String,
      default: 'PKR'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.customerId) ret.customerId = ret.customerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes per Section 7 matching aggregation pipeline filters
customerOrderSchema.index({ orderDate: 1, status: 1, customerId: 1 });
customerOrderSchema.index({ customerId: 1, orderDate: -1 });

export const CustomerOrder = mongoose.model('CustomerOrder', customerOrderSchema);

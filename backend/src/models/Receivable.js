import mongoose from 'mongoose';

const receivableSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerOrder',
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    amountTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for amountTotal'
      }
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for amountPaid'
      }
    },
    amountOutstanding: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for amountOutstanding'
      }
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      required: true,
      default: 'Unpaid'
    },
    paidDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.orderId) ret.orderId = ret.orderId.toString();
        if (ret.customerId) ret.customerId = ret.customerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes per Section 7
receivableSchema.index({ dueDate: 1, status: 1 });
receivableSchema.index({ customerId: 1, status: 1 });

export const Receivable = mongoose.model('Receivable', receivableSchema);

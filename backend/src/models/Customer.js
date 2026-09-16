import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    region: {
      type: String,
      required: true,
      trim: true
    },
    customerType: {
      type: String,
      enum: ['Retail', 'Wholesale', 'Corporate'],
      default: 'Retail'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

customerSchema.index({ region: 1, customerType: 1 });

export const Customer = mongoose.model('Customer', customerSchema);

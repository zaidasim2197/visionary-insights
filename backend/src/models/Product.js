import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    productCode: {
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
    category: {
      type: String,
      required: true,
      trim: true
    },
    // Money fields strictly integer subunits (forbidding floats in DB)
    unitCost: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for unitCost'
      }
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer currency subunit value for unitPrice'
      }
    },
    reorderThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer for reorderThreshold'
      }
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

productSchema.index({ category: 1, isActive: 1 });

export const Product = mongoose.model('Product', productSchema);

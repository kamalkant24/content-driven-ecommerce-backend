import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Predefined Product Categories
const ProductCategory = [
  "Electronics",
  "Clothing & Accessories",
  "Home & Living",
  "Beauty & Health",
  "Sports & Outdoors"
];

// Variant Schema
const variantSchema = new Schema({
  size: { type: String },
  color: { type: String },
});

const productSchema = new Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    discount_price: { type: Number, default: 0 },  // 🔑 Store discounted price in DB
    images: { type: [String], required: true },
    category: { type: String, enum: ProductCategory, required: true },
    quantity: { type: Number, required: true, min: 0 },
    availability: { type: Boolean, default: true },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    variants: [variantSchema],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🗂️ Pre-save Hook to Calculate Discount Price
productSchema.pre("save", function (next) {
  if (this.discount > 0) {
    this.discount_price = this.price - (this.price * this.discount) / 100;
  } else {
    this.discount_price = this.price;  // No Discount
  }
  next();
});

// ✅ Update Discount Price When Product is Updated
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.price !== undefined || update.discount !== undefined) {
    const price = update.price || this._update.price;
    const discount = update.discount || this._update.discount || 0;
    update.discount_price = discount > 0 ? price - (price * discount) / 100 : price;
  }
  next();
});

export default mongoose.model("userProducts", productSchema);

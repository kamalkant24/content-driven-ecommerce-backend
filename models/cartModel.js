import mongoose from "mongoose";

const Schema = mongoose.Schema;
const cartSchema = new Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "userProducts", required: true },
      quantity: { type: Number, required: true, min: 1 }
    }
  ],
  totalPrice: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// 🔄 Auto-update total price before saving
cartSchema.pre("save", async function (next) {
  let total = 0;

  for (const item of this.products) {
    const product = await mongoose.model("userProducts").findById(item.product);
    if (product) {
      total += (product.discount_price ?? product.price) * item.quantity; // ✅ Use discount_price if available
    }
  }

  this.totalPrice = total;
  console.log("Cart Total Price (Before Save):", this.totalPrice); // Debugging
  next();
});

export default mongoose.model("userCart", cartSchema);

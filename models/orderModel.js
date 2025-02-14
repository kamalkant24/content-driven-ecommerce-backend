import mongoose from "mongoose";

const Schema = mongoose.Schema;

const orderSchema = new Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "userProducts", required: true },
        quantity: { type: Number, required: true, min: 1 }
      }
    ],
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    orderStatus: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    paymentMethod: { type: String, enum: ['credit card', 'paypal', 'cash on delivery'], required: true },
    shippingAddress: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });
  

export default mongoose.model("Order", orderSchema);

  
import mongoose from "mongoose";

const checkoutSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true }, // Reference to UserRegister
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "userProducts", required: true },
      quantity: { type: Number, required: true, min: 1 },
    }
  ],
  noOfItems: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  shipping: {
    // MongoDB will automatically generate an ObjectId for the `shipping` object.
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    label: { type: String, required: true },
    price: { type: Number, required: true },
  },
  offer: {
    // MongoDB will automatically generate an ObjectId for the `offer` object.
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    label: { type: String, required: true },
    discount: { type: Number, required: true },
  },
  netPrice: { type: Number, required: true },
  stripeSessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Checkout || mongoose.model("Checkout", checkoutSchema);

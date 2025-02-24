import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true }, // Reference to UserRegister
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "userProducts", required: true },
    }
  ],
  createdDate: { type: Date, default: Date.now }, // Added createdDate field
});

export default mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
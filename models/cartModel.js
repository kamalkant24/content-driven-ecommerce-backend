//Model maps data to database
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const cartSchema = new Schema({
  product: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userProducts",
        required: true,
      },
      count: {
        type: Number,
        // required: true,
      },
    },
  ],
  userId: {
    type: String,
    required: true,
  },
});

export default mongoose.model("userCart", cartSchema);

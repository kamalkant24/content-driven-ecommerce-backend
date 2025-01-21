//Model maps data to database
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const productsSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  quantity: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: Array,
    required:true
  },
  like:{
    type: Boolean,
  },
  cart:{
    type: Boolean,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("userProducts", productsSchema);
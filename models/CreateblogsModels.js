import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate';

const Schema = mongoose.Schema;

/** BLOG SCHEMA **/
const blogsSchema = new Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: [String] }, // Supports multiple images
  categories: {
    type: String,
    enum: [
      "Electronics",
      "Clothing & Accessories",
      "Home & Living",
      "Beauty & Health",
      "Sports & Outdoors"
    ],
    required: true
  },
  tags: { type: [String], default: [] }, 
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserRegister" }],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

blogsSchema.plugin(mongoosePaginate);

export default mongoose.model("createBlogs", blogsSchema);

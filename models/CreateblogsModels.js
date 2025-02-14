//Model maps data to database
import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate'

const Schema = mongoose.Schema;

/** BLOG SCHEMA **/
const blogsSchema = new Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  tags: { type: [String], default: [] }, 
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserRegister" }],
  createdAt: { type: Date, default: Date.now }
});

blogsSchema.plugin(mongoosePaginate);

export default mongoose.model("createBlogs", blogsSchema);

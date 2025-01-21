//Model maps data to database
import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate'

const Schema = mongoose.Schema;

const blogsSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    // required: true,
  },
  text: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updateAt:{
    type: Date,
    default: Date.now,
  }
});

blogsSchema.plugin(mongoosePaginate);

export default mongoose.model("createBlogs", blogsSchema);

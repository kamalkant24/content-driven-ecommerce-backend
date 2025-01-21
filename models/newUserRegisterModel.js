//Model maps data to database
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  confirmPassword: {
    type: String,
    required: false,
  },
  phone: {
    type: Number,
    // required: true,
  },
  profile_img: {
    type: String,
  },
  org_Name:{
    type:String,
  },
  industry:{
type :String
  },
  org_Size:{
    type:String
  },

  uniqueString: {
    type: String,
    required: false,
  },
  isValid: {
    type: Boolean,
    required: false,
  },
  isReadDocumentation:{
    type: Boolean,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("UserRegister", userSchema);

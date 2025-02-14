import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, match: [/^\d{10,15}$/, "Invalid phone number"] }, 
  profile_img: { type: String },
  role: { type: String, enum: ['vendor', 'customer', 'admin'] },
  address: { type: String }, 
  org_Name: { type: String },
  industry: { 
    type: String,
    enum: [
      'Technology & Electronics', 
      'Fashion & Apparel', 
      'Home & Living', 
      'Health & Wellness', 
      'Sports & Recreation'
    ],
   
  },
  uniqueString: { type: String },
  org_Size: { type: String },
  description: { type: String }, // Added description field
  banner: { type: String },  
  isValid: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false }, // Admin approval for vendors
  isReadDocumentation: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("UserRegister", userSchema);

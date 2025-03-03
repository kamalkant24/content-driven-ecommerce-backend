import mongoose from "mongoose";

const adminRegisterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    phone: {
      type: String,
     
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
    isValid: {
      type: Boolean,
      default: true, // Admins are valid by default
    },
    isApproved: {
      type: Boolean,
      default: true, // No approval required for admins
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const AdminRegister = mongoose.model("AdminRegister", adminRegisterSchema);

export default AdminRegister;

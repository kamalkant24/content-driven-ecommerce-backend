import bcrypt from "bcrypt";
import jsonwebtoken from "../jwt/jwt.js";
import AdminRegister from "../models/adminModel.js";
import UserRegister from "../models/newUserRegisterModel.js";
import Reviews from "../models/reviewModel.js";


import userProducts from "../models/productsModels.js";
import Orders from "../models/orderModel.js";


/**
 * ✅ Register Admin
 */
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingAdmin = await AdminRegister.findOne({ role: "admin" });
    if (existingAdmin && (!req.user || req.user.role !== "admin")) {
      return res.status(403).json({ error: "Only admins can create new admins" });
    }

    const adminExists = await AdminRegister.findOne({ email });
    if (adminExists) return res.status(400).json({ error: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new AdminRegister({ name, email, password: hashedPassword, phone, role: "admin", isValid: true, isApproved: true });
    await admin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

/**
 * ✅ Admin Login
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await AdminRegister.findOne({ email, role: "admin" });
    if (!admin) return res.status(400).json({ error: "Admin not found" });

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) return res.status(400).json({ error: "Incorrect password" });

    const token = jsonwebtoken(admin);
    res.status(200).json({ code: 200, token, message: "Admin logged in successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

/**
 * ✅ Approve Vendor
 */
export const approveVendor = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserRegister.findOne({ email, role: "vendor" });
    if (!user) return res.status(400).json({ error: "Vendor not found" });

    user.isApproved = true;
    await user.save();
    res.status(200).json({ message: "Vendor approved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error approving vendor" });
  }
};

/**
 * ✅ Reject Vendor
 */
export const rejectVendor = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserRegister.findOneAndDelete({ email, role: "vendor" });
    if (!user) return res.status(404).json({ error: "Vendor not found or already deleted" });

    res.status(200).json({ message: "Vendor rejected and deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error rejecting vendor" });
  }
};

/**
 * ✅ View All Users (Vendors & Customers)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filters = role ? { role } : {};
    const users = await UserRegister.find(filters).select("-password");
    res.status(200).json({ message: "Users fetched successfully", data: users });
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
};

/**
 * ✅ Delete User (Admin Only)
 */
export const deleteUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required to delete a user" });

    const user = await UserRegister.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ error: "User not found or already deleted" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting user", details: err.message });
  }
};

/**
 * ✅ Manage Products
 */
export const getAllProducts = async (req, res) => {
  try {
    const products = await userProducts.find().populate("vendor", "name email");
    res.status(200).json({ message: "Products fetched successfully", data: products });
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
};

export const approveProduct = async (req, res) => {
  try {
    const product = await userProducts.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.status(200).json({ message: "Product approved successfully", data: product });
  } catch (err) {
    res.status(500).json({ error: "Error approving product" });
  }
};

export const rejectProduct = async (req, res) => {
  try {
    const product = await userProducts.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.status(200).json({ message: "Product rejected and deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error rejecting product" });
  }
};

/**
 * ✅ Monitor Orders
 */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Orders.find()
      .populate("customer", "name email")
      .populate("products.product", "title price")
      .select("totalAmount paymentStatus shippingDetails createdAt");
    res.status(200).json({ message: "Orders fetched successfully", data: orders });
  } catch (error) {
    res.status(500).json({ error: "Error fetching orders" });
  }
};

/**
 * ✅ Manage Reviews & Comments
 */
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Reviews.find()
      .populate("product", "title")
      .populate("customer", "name email");
    res.status(200).json({ message: "Reviews fetched successfully", data: reviews });
  } catch (error) {
    res.status(500).json({ error: "Error fetching reviews" });
  }
};

export const approveReview = async (req, res) => {
  try {
    const review = await Reviews.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (!review) return res.status(404).json({ error: "Review not found" });

    res.status(200).json({ message: "Review approved successfully", data: review });
  } catch (err) {
    res.status(500).json({ error: "Error approving review" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Reviews.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting review" });
  }
};

export const approveComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const review = await Reviews.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const comment = review.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.isApproved = true;
    await review.save();

    res.status(200).json({ message: "Comment approved successfully", data: comment });
  } catch (err) {
    res.status(500).json({ error: "Error approving comment" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const review = await Reviews.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const comment = review.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.remove();
    await review.save();

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting comment" });
  }
};

/**
 * ✅ Monitor Payments (via Orders model)
 */
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Orders.find({ paymentStatus: { $exists: true } })
      .select("totalAmount paymentStatus paymentMethod createdAt");
    res.status(200).json({ message: "Payments fetched successfully", data: payments });
  } catch (error) {
    res.status(500).json({ error: "Error fetching payments" });
  }
};

import bcrypt from "bcrypt";
import jsonwebtoken from "../jwt/jwt.js";
import AdminRegister from "../models/adminModel.js";
import UserRegister from "../models/newUserRegisterModel.js";
import Reviews from "../models/reviewModel.js";
import userProducts from "../models/productsModels.js";
import Orders from "../models/orderModel.js";
import { sendApprovalEmail, sendRejectionEmail, sendProductApprovalEmail,sendProductRejectionEmail,sendReviewApprovalEmail, sendReviewRejectionEmail, sendCommentApprovalEmail,sendCommentRejectionEmail  } from "../utils/sendEmail.js";

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
export const getPendingVendors = async (req, res) => {
  try {
    const pendingVendors = await UserRegister.find({ role: "vendor", isApproved: false }).select("-password");
    res.status(200).json({ message: "Pending vendors fetched successfully", data: pendingVendors });
  } catch (error) {
    res.status(500).json({ error: "Error fetching pending vendors", details: error.message });
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

    // Send approval email
    await sendApprovalEmail(email);

    res.status(200).json({ message: "Vendor approved successfully and email sent" });
  } catch (err) {
    console.error("Error approving vendor:", err);
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

    await sendRejectionEmail(email); // 📧 Notify vendor
    res.status(200).json({ message: "Vendor rejected and email sent" });
  } catch (err) {
    res.status(500).json({ error: "Error rejecting vendor", details: err.message });
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
    // Populate vendor email to ensure it's available
    const product = await userProducts.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).populate("vendor", "email");

    if (!product) return res.status(404).json({ error: "Product not found" });

    const vendorEmail = product.vendor?.email;
    if (!vendorEmail) {
      console.error(`❌ No email found for vendor of product: ${product.title}`);
      return res.status(400).json({ error: "Vendor email not found" });
    }

    await sendProductApprovalEmail(vendorEmail, product.title);
    res.status(200).json({ message: "Product approved and email sent", data: product });
  } catch (err) {
    res.status(500).json({ error: "Error approving product", details: err.message });
  }
};

/**
 * ✅ Reject Product (With Email)
 */
export const rejectProduct = async (req, res) => {
  try {
    const product = await userProducts.findById(req.params.id).populate("vendor", "email");
    if (!product) return res.status(404).json({ error: "Product not found" });

    const vendorEmail = product.vendor?.email;
    if (!vendorEmail) {
      console.error(`❌ No email found for vendor of product: ${product.title}`);
      return res.status(400).json({ error: "Vendor email not found" });
    }

    await userProducts.findByIdAndDelete(req.params.id); // Ensure email is fetched before deleting
    await sendProductRejectionEmail(vendorEmail, product.title);
    res.status(200).json({ message: "Product rejected and email sent" });
  } catch (err) {
    res.status(500).json({ error: "Error rejecting product", details: err.message });
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

    // Send approval email
    await sendReviewApprovalEmail(review.userEmail, review.content);

    res.status(200).json({ message: "Review approved successfully", data: review });
  } catch (err) {
    res.status(500).json({ error: "Error approving review" });
  }
};

// ❌ Delete (Reject) Review Function (with email notification)
export const deleteReview = async (req, res) => {
  try {
    const review = await Reviews.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    // Send rejection email
    await sendReviewRejectionEmail(review.userEmail, review.content, "Your review did not meet our guidelines.");

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting review" });
  }
};
// ✅ Approve Comment Function (with email notification)
export const approveComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const review = await Reviews.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const comment = review.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.isApproved = true;
    await review.save();

    // Send approval email
    await sendCommentApprovalEmail(comment.userEmail, comment.content);

    res.status(200).json({ message: "Comment approved successfully", data: comment });
  } catch (err) {
    res.status(500).json({ error: "Error approving comment" });
  }
};

// ❌ Delete (Reject) Comment Function (with email notification)
export const deleteComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const review = await Reviews.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const comment = review.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const userEmail = comment.userEmail;
    const commentContent = comment.content;

    comment.remove();
    await review.save();

    // Send rejection email
    await sendCommentRejectionEmail(userEmail, commentContent, "Your comment did not meet our guidelines.");

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

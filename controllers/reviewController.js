import  Review  from "../models/reviewModel.js";
import Order from "../models/orderModel.js";
import userProducts from "../models/productsModels.js";
import { jwtDecode } from "jwt-decode";
import sanitizeHtml from "sanitize-html"; // To sanitize comments

// Token Validation Helper
const validateToken = (req) => {
  const token = req.header("Authorization");
  if (!token) throw new Error("Authorization token is missing");
  return jwtDecode(token);
};

// Add a Review
export const addReview = async (req, res) => {
  try {
    const decoded = validateToken(req);
    const { productId, rating, comment } = req.body;

    // Input Validation
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    if (!comment || comment.trim() === "") {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    // Check if the customer has purchased the product
    const hasPurchased = await Order.findOne({
      customer: decoded._id,
      "products.product": productId,
    });

    if (!hasPurchased) {
      return res.status(400).json({ message: "You can only review products you have purchased." });
    }

    // Check if the user has already reviewed this product
    const existingReview = await Review.findOne({ customer: decoded._id, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product." });
    }

    // Sanitize the comment
    const sanitizedComment = sanitizeHtml(comment);

    // Create and save the new review
    const newReview = new Review({
      product: productId,
      customer: decoded._id,
      rating,
      comment: sanitizedComment,
    });

    await newReview.save();
    res.status(201).json({ message: "Review submitted successfully." });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Get Product Reviews with Pagination
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query; // Pagination params

    const reviews = await Review.find({ product: productId })
      .populate("customer", "name")
      .select("rating comment createdAt")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalReviews = await Review.countDocuments({ product: productId });

    res.status(200).json({
      reviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit),
    });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Edit a Review
export const editReview = async (req, res) => {
  try {
    const decoded = validateToken(req);
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    // Input Validation
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    if (!comment || comment.trim() === "") {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const review = await Review.findOne({ _id: reviewId, customer: decoded._id });
    if (!review) {
      return res.status(404).json({ message: "Review not found or unauthorized." });
    }

    review.rating = rating;
    review.comment = sanitizeHtml(comment);
    await review.save();

    res.status(200).json({ message: "Review updated successfully." });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Delete a Review
export const deleteReview = async (req, res) => {
  try {
    const decoded = validateToken(req);
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({ _id: reviewId, customer: decoded._id });
    if (!review) {
      return res.status(404).json({ message: "Review not found or unauthorized." });
    }

    res.status(200).json({ message: "Review deleted successfully." });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// Vendor Moderation with Rejection Reason
export const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reviewStatus, rejectionReason = "" } = req.body;
    const vendorId = req.user._id; // Assuming authentication middleware sets req.user

    if (!reviewId || !["approved", "rejected"].includes(reviewStatus)) {
      return res.status(400).json({ message: "Invalid review ID or status." });
    }

    // Find the review with product details
    const review = await Review.findById(reviewId).populate("product");
    if (!review) return res.status(404).json({ message: "Review not found." });

    // Verify vendor ownership of the product
    const product = await userProducts.findById(review.product._id);
    if (!product || String(product.vendor) !== String(vendorId)) {
      return res.status(403).json({ message: "Unauthorized: You can only moderate reviews on your products." });
    }

    // Update review status and optionally append rejection reason
    review.reviewStatus = reviewStatus;
    if (reviewStatus === "rejected" && rejectionReason) {
      review.comment = `${review.comment} (Reason: ${sanitizeHtml(rejectionReason)})`;
    }
    await review.save();

    res.status(200).json({ message: `Review ${reviewStatus} successfully.` });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

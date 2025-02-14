
  import mongoose from "mongoose";

  const Schema = mongoose.Schema;
  /** REVIEW & RATING SCHEMA **/
  const reviewSchema = new Schema({
      product: { type: mongoose.Schema.Types.ObjectId, ref: "userProducts", required: true },
      customer: { type: mongoose.Schema.Types.ObjectId, ref: "UserRegister", required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String },
      reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // Admin moderation
      createdAt: { type: Date, default: Date.now }
    });
    
    export const Review = mongoose.model("Review", reviewSchema);
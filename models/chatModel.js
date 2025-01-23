//Model maps data to database
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const chatSchema = new Schema({
  sender_id: {
    type: String, // Use String since your IDs are stored as strings
    required: true, // Ensures the field is mandatory
  },
  receiver_id: {
    type: String,
    required: true,
  },
  messages: {
    type: String,
    required: true, // Makes messages mandatory
  },
  file: String,
  is_seen: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

export default mongoose.model("usersChat", chatSchema);

//Model maps data to database
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const chatSchema = new Schema({
        sender_id: {
          type: Number,
         
        },
        receiver_id: {
          type: Number,
        },
        messages: String,
        file: String,
        is_seen: {
          type: Boolean,
          default: false,
        },
      },
      {
        timestamps: true, // Adds createdAt and updatedAt automatically
      }
);

export default mongoose.model("usersChat", chatSchema);

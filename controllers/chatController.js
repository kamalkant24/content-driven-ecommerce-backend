import { jwtDecode } from "jwt-decode";
import usersChat from '../models/chatModel.js'

export const userChat = async (req, res) => {
  try {
    // Log the incoming request data
    console.log("Received data:", req.body);

    const { sender_id, receiver_id, messages } = req.body;

    // Validate required fields
    if (!sender_id || !receiver_id || !messages) {
      return res.status(400).json({
        error: "Missing required fields: sender_id, receiver_id, or messages",
      });
    }

    const createingData = await usersChat.create({ sender_id, receiver_id, messages, file: req.body.file });
    console.log("Created chat:", createingData);

    return res.status(201).json(createingData); // Send the created document as a response
  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



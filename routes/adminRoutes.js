import express from "express";
import { registerAdmin, loginAdmin } from "../controllers/adminController.js";
import adminAuth from "../middleware/adminAuth.js";

const router = express.Router();

// ✅ Register admin (Controller handles token check)
router.post("/register", registerAdmin);

// ✅ Admin login (No token needed)
router.post("/login", loginAdmin);

export default router;

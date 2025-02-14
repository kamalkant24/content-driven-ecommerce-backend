import bcrypt from "bcrypt";
import jsonwebtoken from "../jwt/jwt.js";
import UserRegister from "../models/newUserRegisterModel.js";


export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if any admin already exists
        const existingAdmin = await UserRegister.findOne({ role: "admin" });

        if (existingAdmin) {
            // If an admin exists, require authentication
            if (!req.user || req.user.role !== "admin") {
                return res.status(403).json({ error: "Only admins can create new admins" });
            }
        }

        // Check if admin email already exists
        const adminExists = await UserRegister.findOne({ email });
        if (adminExists) {
            return res.status(400).json({ error: "Admin already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        const admin = new UserRegister({
            name,
            email,
            password: hashedPassword,
            phone,
            role: "admin",
            isValid: true,  // Admins are valid by default
            isApproved: true, // No approval required
        });

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

        // Find admin by email
        const admin = await UserRegister.findOne({ email, role: "admin" });
        if (!admin) {
            return res.status(400).json({ error: "Admin not found" });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: "Incorrect password" });
        }

        // Generate token
        const token = jsonwebtoken(admin);

        res.status(200).json({
            code: 200,
            token: token,
            message: "Admin Logged in successfully",
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

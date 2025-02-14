import { jwtDecode } from "jwt-decode";
import UserRegister from "../models/newUserRegisterModel.js";

const adminAuth = async (req, res, next) => {
    try {
        const token = req.header("Authorization");
        if (!token) return res.status(401).json({ error: "Access denied" });

        const decoded = jwtDecode(token);
        const admin = await UserRegister.findById(decoded._id);

        if (!admin || admin.role !== "admin") {
            return res.status(403).json({ error: "Unauthorized: Admin access required" });
        }

        req._id = decoded._id;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token", details: err });
    }
};

export default adminAuth;

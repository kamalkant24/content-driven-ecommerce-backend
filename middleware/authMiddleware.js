import jwt from "jsonwebtoken";

// Verify JWT Token Middleware
export const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); // Debugging line
    req.user = decoded; // Attach decoded user to request
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", error: err.message });
  }
};

// Middleware to verify if user is a vendor
export const isVendor = (req, res, next) => {
  if (!req.user || req.user.role !== "vendor") {
    return res.status(403).json({ message: "Access denied. Only vendors can perform this action." });
  }
  next();
};

// Middleware to verify if user is a customer
export const verifyCustomerRole = (req, res, next) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({ message: "Access denied. Only customers can perform this action." });
  }
  next();
};

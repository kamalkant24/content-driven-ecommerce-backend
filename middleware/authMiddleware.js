import jwt from "jsonwebtoken";

// Verify JWT Token Middleware
export const verifyToken = (req, res, next) => {
  console.log("Middleware Request Object:", req); // Debugging line
  console.log("Middleware Request Headers:", req.headers); // Check headers

  if (!req.headers) {
    return res.status(400).json({ message: "Headers missing in request" });
  }

  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  console.log("Authorization Header:", authHeader);

  if (!authHeader) {
    return res.status(403).json({ message: "Authorization header missing" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Invalid token format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT Error:", err.message);
    return res.status(401).json({ message: "Unauthorized", error: err.message });
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

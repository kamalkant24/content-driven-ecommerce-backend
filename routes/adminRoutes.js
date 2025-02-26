import { Router } from "express";
import { 
  registerAdmin, 
  loginAdmin, 
  approveVendor, 
  rejectVendor, 
  getAllUsers, 
  deleteUser, 
  getAllProducts, 
  approveProduct, 
  rejectProduct, 
  getAllOrders, 
  getAllPayments, 
  getAllReviews, 
  approveReview, 
  deleteReview, 
  approveComment, 
  deleteComment 
} from "../controllers/adminController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import  isAdmin from "../middleware/adminAuth.js"

const adminRouter = Router();

// ✅ Admin Authentication
adminRouter.post("/register",  registerAdmin); 
adminRouter.post("/login", loginAdmin); 

// ✅ Vendor Management
adminRouter.post("/approve-vendor", verifyToken, isAdmin, approveVendor); 
adminRouter.delete("/reject-vendor", verifyToken, isAdmin, rejectVendor); 

// ✅ User Management
adminRouter.get("/get-all-users", verifyToken, isAdmin, getAllUsers); 
adminRouter.delete("/delete-user", verifyToken, isAdmin, deleteUser); 

// ✅ Product Management
adminRouter.get("/get-all-products", verifyToken, isAdmin, getAllProducts); 
adminRouter.post("/approve-product/:id", verifyToken, isAdmin, approveProduct); 
adminRouter.delete("/reject-product/:id", verifyToken, isAdmin, rejectProduct); 

// ✅ Order & Payment Monitoring
adminRouter.get("/get-all-orders", verifyToken, isAdmin, getAllOrders); 
adminRouter.get("/get-all-payments", verifyToken, isAdmin, getAllPayments); 

// ✅ Review & Comment Management
adminRouter.get("/get-all-reviews", verifyToken, isAdmin, getAllReviews); 
adminRouter.post("/approve-review/:id", verifyToken, isAdmin, approveReview); 
adminRouter.delete("/delete-review/:id", verifyToken, isAdmin, deleteReview); 
adminRouter.post("/approve-comment/:reviewId/:commentId", verifyToken, isAdmin, approveComment); 
adminRouter.delete("/delete-comment/:reviewId/:commentId", verifyToken, isAdmin, deleteComment); 

export default adminRouter;
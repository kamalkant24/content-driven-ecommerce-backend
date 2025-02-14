import { Router } from "express";
import { login, register, getAllUser, deleteUser, approveVendor, updateUser, getUserProfile, logOut, verifyApi, confirmationApi } from "../controllers/userController.js";
import { verifyToken, isVendor, verifyCustomerRole }from "../middleware/authMiddleware.js";
import { download, getListFiles, upload } from "../controllers/file.Controller.js";
import {
  createUserBlogs,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  likeBlog,
  unlikeBlog
} from "../controllers/blogsController.js";
import { createUserProducts, getAllProducts, getProductById, updateProduct, deleteProduct, getVendorProducts } from "../controllers/productsController.js";
import { searchAll } from "../controllers/globalSearchController.js";
import { userChat } from "../controllers/chatController.js";
import uploadImage from "../middleware/singleMulter.js";
import uploadFile from "../models/upload.js"
import { addToCart, getCarts, updateCart, removeFromCart } from "../controllers/cartController.js";
import {
  createOrder, getUserOrders, getOrderById,
  updateOrderStatus, cancelOrder, deleteOrder
} from "../controllers/orderController.js";
import {
  addReview, getProductReviews, editReview,
  deleteReview, moderateReview
} from "../controllers/reviewController.js";
const userRouter = Router();

// Authentication Routes
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.get("/logout", verifyToken, logOut);
userRouter.get("/verify/:uniqueString", verifyApi);

// User Management (Admin & User)
userRouter.get("/all", verifyToken, getAllUser);
userRouter.post("/delete", verifyToken, deleteUser);
userRouter.post(
  "/update",
  verifyToken,
  uploadImage.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 }
  ]),
  updateUser
);

userRouter.get("/user-profile", verifyToken, getUserProfile);
userRouter.post(
  "/confirmation",
  verifyToken,
  uploadImage.fields([
    { name: "logo", maxCount: 1 }, // Required for both customers and vendors
    { name: "banner", maxCount: 1 }, // Required only for vendors
  ]),
  confirmationApi
);
userRouter.post("/approve-vendor", verifyToken, approveVendor);

// File Management
userRouter.post('/file-upload', verifyToken, uploadFile, upload)
userRouter.get("/get-files", verifyToken, getListFiles);
userRouter.get("/download-all", verifyToken, download);

// Blog Routes
userRouter.post("/create-blogs", verifyToken, createUserBlogs);
userRouter.get("/get-all-blogs", verifyToken, getAllBlogs);
userRouter.get("/get-all-blogby/:id", verifyToken, getBlogById);               // Get a blog by ID
userRouter.put("/update-blogs/:id", verifyToken, updateBlog);               // Update a blog
userRouter.delete("/delete-blog/:id", verifyToken, deleteBlog);            // Delete a blog
userRouter.post("/like-blogs/:id/like", verifyToken, likeBlog);           // Like a blog
userRouter.post("/unlike-blogs/:id/unlike", verifyToken, unlikeBlog);

// Product Routes
userRouter.post("/create-products", verifyToken, isVendor, uploadImage.array("image"), createUserProducts);
userRouter.post("/update-product/:id", verifyToken, isVendor, uploadImage.array("image"), updateProduct);

userRouter.get("/get-all-products", verifyToken, getAllProducts);
userRouter.get("/get-product/:id", verifyToken, getProductById);
userRouter.delete("/delete-product/:id", verifyToken, isVendor, deleteProduct);
userRouter.get("/get-vendor-products", verifyToken, isVendor, getVendorProducts);


// Cart Routes
userRouter.post("/add-to-cart", verifyToken, verifyCustomerRole, addToCart);
userRouter.post("/update-cart", verifyToken, verifyCustomerRole, updateCart);
userRouter.get("/carts", verifyToken, verifyCustomerRole, getCarts);
userRouter.delete("/remove-from-cart", verifyToken, verifyCustomerRole, removeFromCart);

// Order Routes
userRouter.post("/create-order", verifyToken, createOrder);
userRouter.get("/get-user-orders", verifyToken, getUserOrders);
userRouter.get("/get-order/:orderId", verifyToken, getOrderById);
userRouter.put("/update-order-status/:orderId", verifyToken, updateOrderStatus);
userRouter.put("/cancel-order/:orderId", verifyToken, cancelOrder);
userRouter.delete("/delete-order/:orderId", verifyToken, deleteOrder);

// Review Routes
userRouter.post("/add-review", verifyToken, addReview);                      // Add a review
userRouter.get("/get-reviews/:productId", getProductReviews);               // Get reviews for a product
userRouter.put("/edit-review/:reviewId", verifyToken, editReview);          // Edit a review
userRouter.delete("/delete-review/:reviewId", verifyToken, deleteReview);   // Delete a review
userRouter.put("/moderate-review/:reviewId", verifyToken, moderateReview);  // Admin: moderate reviews
// Global Search
userRouter.get("/search-all", searchAll);

// Chat
userRouter.post("/user-chat", userChat);





export default userRouter;

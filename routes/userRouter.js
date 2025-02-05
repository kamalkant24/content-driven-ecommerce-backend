import { Router } from "express";
import { login, register, getAllUser, deleteUser, updateUser, getUserProfile, logOut, verifyApi, confirmationApi } from "../controllers/userController.js";
import verifyToken from "../middleware/authMiddleware.js";
import { download, getListFiles, upload } from "../controllers/file.Controller.js";
import { createUserBlogs, getAllBlogs } from "../controllers/blogsController.js";
import { createUserProducts, getAllProducts, getProductById, updateProduct, deleteProduct } from "../controllers/productsController.js";
import { searchAll } from "../controllers/globalSearchController.js";
import { userChat } from "../controllers/chatController.js";
import uploadImage from "../middleware/singleMulter.js";
import uploadFile from "../models/upload.js"
import { addToCart, getCarts, updateCart } from "../controllers/cartController.js";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.get("/all", verifyToken, getAllUser);
userRouter.post("/delete", verifyToken, deleteUser);
userRouter.post("/update", verifyToken, updateUser);
userRouter.get('/user-profile', verifyToken, getUserProfile)
userRouter.post('/file-upload', verifyToken, uploadFile, upload)
userRouter.get('/get-files', verifyToken, getListFiles)
userRouter.get('/download-all', verifyToken, download)
userRouter.get('/logout', verifyToken, logOut)
userRouter.post('/create-blogs', verifyToken, createUserBlogs)
userRouter.get('/get-all-blogs', verifyToken, getAllBlogs)
userRouter.post('/create-products', verifyToken, uploadImage.array("image"), createUserProducts)
userRouter.get('/search-all', searchAll)
userRouter.post('/user-chat', userChat)
userRouter.get('/get-all-produts', verifyToken, getAllProducts)
userRouter.get("/get-product/:id", verifyToken, getProductById);
userRouter.put("/update-product/:id", verifyToken,uploadImage.array("image"), updateProduct);
userRouter.delete("/delete-product/:id", verifyToken, deleteProduct); // Soft delete

userRouter.post('/add-to-cart', verifyToken, addToCart)
userRouter.post('/update-cart', verifyToken, updateCart)
userRouter.get('/carts', verifyToken, getCarts)
userRouter.get('/verify/:uniqueString', verifyApi)
userRouter.post('/confirmation', verifyToken, uploadImage.single("profile_img"), confirmationApi)





export default userRouter;

import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Ensure Directory Exists
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// ✅ Multer Storage Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dir = "./resource/static/assets/products"; // Default directory

    // ✅ Dynamically set directory based on field name
    if (file.fieldname === "logo") {
      dir = "./resource/static/assets/profile";
    } else if (file.fieldname === "banner") {
      dir = "./resource/static/assets/banner";
    } else if (file.fieldname === "product") {
      dir = "./resource/static/assets/products";
    } if (file.fieldname === "image") {  // ✅ Blog images field name should be "image"
      dir = "./resource/static/assets/blogs";
    }
    

    ensureDirectoryExists(dir); // Ensure the directory exists
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Save with unique name
  },
});

// ✅ File Filter for Images Only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image files are allowed!"),
      false
    );
  }
};

// ✅ Upload Config
const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// ✅ Export Middlewares
export const uploadSingleImage = uploadImage.single("image");
export const uploadMultipleImages = uploadImage.array("image", 10); // Max 10 images
export const uploadProfileImage = uploadImage.single("logo");       // For logo uploads
export const uploadBannerImage = uploadImage.single("banner");      // For banner uploads
export const uploadProductImage = uploadImage.single("product");    // For product uploads
export const uploadBlogImage = uploadImage.array("image", 10); // Multiple images with key "image"
 // Allows up to 10 images
         

// ✅ Handle both logo and banner in a single request
export const uploadLogoAndBanner = uploadImage.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

export default uploadImage;

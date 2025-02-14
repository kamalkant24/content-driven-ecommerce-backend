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
    const dir = "./resource/static/assets/products";
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Save with unique name
  },
});

// ✅ File Filter for Images Only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image files are allowed!"), false);
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

export default uploadImage;

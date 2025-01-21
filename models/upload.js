import multer from "multer";

const maxSize = 2 * 1024 * 1024;
const basedir = process.cwd();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${basedir}/resource/static/assets/uploads/`);
  },
  filename: (req, file, cb) => {
    const newName = "Rajat" + Date.now() + ".png";
    cb(null, newName);
  },
});

const uploadFile = multer({
  storage: storage,
  limits: { fileSize: maxSize },
}).single("file");



export default uploadFile;
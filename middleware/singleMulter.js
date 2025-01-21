import multer from "multer";

var storage = multer.diskStorage({   
    destination: function(req, file, cb) { 
    // destination is used to specify the path of the directory in which the files have to be stored
    cb(null, './resource/static/assets/profile');    
  }, 
  filename: function (req, file, cb) { 
// It is the filename that is given to the saved file.
     cb(null , file.originalname);   
  }
});

// Configure storage engine instead of dest object.
const uploadImage = multer({ storage: storage })

export default uploadImage

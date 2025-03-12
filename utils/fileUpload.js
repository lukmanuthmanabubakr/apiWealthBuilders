// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("./cloudinary"); // Import Cloudinary config

// // Configure Cloudinary Storage for Multer
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: "kyc_documents", // Folder in Cloudinary
//     format: async (req, file) => "png", // Convert all uploads to PNG
//     public_id: (req, file) => `${file.fieldname}-${Date.now()}`,
//   },
// });

// // File filter to allow only images and PDFs
// const fileFilter = (req, file, cb) => {
//   const allowedFileTypes = /jpeg|jpg|png|gif|webp|bmp|heic|pdf/;
//   const extname = allowedFileTypes.test(file.originalname.toLowerCase());
//   const mimetype = allowedFileTypes.test(file.mimetype);

//   if (extname && mimetype) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only .jpeg, .jpg, .png, .gif, .webp, .bmp, .heic, and .pdf files are allowed"));
//   }
// };

// // Set up multer middleware
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
//   fileFilter,
// });

// module.exports = upload;

















const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary"); // Import Cloudinary config

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    console.log("Uploading File:", file.originalname, "MIME Type:", file.mimetype); // Debugging
    return {
      folder: "kyc_documents", // Folder in Cloudinary
      format: "jpg", // Convert all images to JPG (better for compatibility)
      public_id: `${file.fieldname}-${Date.now()}`,
    };
  },
});

// File filter to allow only specific image types
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp|bmp|heic|heif|pdf/;
  const extname = allowedFileTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  console.log("File Type Check:", file.mimetype); // Debugging

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg, .png, .gif, .webp, .bmp, .heic, .heif, and .pdf files are allowed"));
  }
};

// Set up multer middleware
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
  fileFilter,
});

module.exports = upload;

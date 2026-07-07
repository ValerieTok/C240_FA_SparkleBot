const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const uploadController = require("../controllers/uploadController");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "public", "uploads");

// Ensure uploaded screenshots have a folder to save into.
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const safeExtension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;

    callback(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }

    callback(new Error("Please upload an image file."));
  }
});

router.get("/", uploadController.showUpload);
router.post("/", (req, res) => {
  upload.single("screenshot")(req, res, (error) => {
    if (error) {
      uploadController.showUploadError(req, res, error.message);
      return;
    }

    uploadController.analyzeUpload(req, res);
  });
});

module.exports = router;

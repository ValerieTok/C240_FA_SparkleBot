const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const homeController = require("../controllers/homeController");
const checkerController = require("../controllers/checkerController");
const chatbotController = require("../controllers/chatbotController");
const aboutController = require("../controllers/aboutController");
const reportController = require("../controllers/reportController");
const feedbackController = require("../controllers/feedbackController");
const scamTrendsController = require("../controllers/scamTrendsController");
const digitalTwinController = require("../controllers/digitalTwinController");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "public", "uploads");

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

// Routes only connect URLs to controller methods.
router.get("/", homeController.showHome);
router.get("/checker", checkerController.showChecker);
router.post("/checker", (req, res) => {
  upload.single("screenshot")(req, res, (error) => {
    if (error) {
      checkerController.showUploadError(req, res, error.message);
      return;
    }

    checkerController.analyzeMessage(req, res);
  });
});
router.get("/chatbot", chatbotController.showChatbot);
router.post("/chatbot/recommended-learning-context", chatbotController.submitRecommendedLearningContext);
router.get("/digital-twin", digitalTwinController.showPage);
router.get("/report-scam", reportController.showReport);
router.post("/report-scam", reportController.submitReport);
router.get("/admin/scam-trends", scamTrendsController.showDashboard);
router.get("/feedback", feedbackController.showFeedback);
router.post("/feedback", feedbackController.submitFeedback);
router.get("/feedback-dashboard", feedbackController.getFeedbackDashboard);
router.get("/about", aboutController.showAbout);

module.exports = router;

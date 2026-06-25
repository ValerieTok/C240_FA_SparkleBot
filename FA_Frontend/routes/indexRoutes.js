const express = require("express");
const homeController = require("../controllers/homeController");
const checkerController = require("../controllers/checkerController");
const uploadController = require("../controllers/uploadController");
const chatbotController = require("../controllers/chatbotController");
const aboutController = require("../controllers/aboutController");

const router = express.Router();

// Routes only connect URLs to controller methods.
router.get("/", homeController.showHome);
router.get("/checker", checkerController.showChecker);
router.post("/checker", checkerController.analyzeMessage);
router.get("/upload", uploadController.showUpload);
router.get("/chatbot", chatbotController.showChatbot);
router.get("/about", aboutController.showAbout);

module.exports = router;

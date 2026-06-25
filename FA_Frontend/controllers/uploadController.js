const pageModel = require("../models/pageModel");
const geminiService = require("../services/geminiService");
const botpressService = require("../services/botpressService");

function renderUploadPage(res, options = {}) {
  res.render("layout", {
    title: "Screenshot Upload",
    currentPage: "upload",
    page: pageModel.getPage("upload"),
    uploadedImage: options.uploadedImage || null,
    extractedText: options.extractedText || null,
    analysis: options.analysis || null,
    errorMessage: options.errorMessage || null,
    body: "pages/upload"
  });
}

exports.showUpload = (req, res) => {
  renderUploadPage(res);
};

exports.showUploadError = (req, res, message) => {
  renderUploadPage(res, {
    errorMessage: message || "The screenshot could not be uploaded. Please try again."
  });
};

exports.analyzeUpload = async (req, res) => {
  try {
    if (!req.file) {
      renderUploadPage(res, {
        errorMessage: "Please choose an image file before analyzing."
      });
      return;
    }

    const uploadedImage = `/uploads/${req.file.filename}`;
    const extractedText = await geminiService.extractTextFromImage(req.file.path, req.file.mimetype);

    if (!extractedText) {
      renderUploadPage(res, {
        uploadedImage,
        extractedText: "No readable text found in image."
      });
      return;
    }

    const analysis = await botpressService.analyzeMessage(extractedText);

    renderUploadPage(res, {
      uploadedImage,
      extractedText,
      analysis
    });
  } catch (error) {
    console.error("Screenshot analysis failed:", error.message);

    renderUploadPage(res, {
      uploadedImage: req.file ? `/uploads/${req.file.filename}` : null,
      errorMessage: getFriendlyUploadError(error)
    });
  }
};

function getFriendlyUploadError(error) {
  const message = error.message || "";

  if (message.includes("GEMINI") || /"status"\s*:\s*"(RESOURCE_EXHAUSTED|UNAVAILABLE|NOT_FOUND)"/.test(message)) {
    return geminiService.getFriendlyGeminiError(error);
  }

  return botpressService.getFriendlyBotpressError(error);
}

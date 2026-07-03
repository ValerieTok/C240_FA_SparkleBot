const pageModel = require("../models/pageModel");
const geminiService = require("../services/geminiService");
const openaiService = require("../services/openaiService");
const n8nService = require("../services/n8nService");

function renderCheckerPage(res, options = {}) {
  res.render("layout", {
    title: "Scam Detector",
    currentPage: "checker",
    page: pageModel.getPage("checker"),
    activeMode: options.activeMode || "text",
    submittedMessage: options.submittedMessage || "",
    submittedUrl: options.submittedUrl || "",
    notes: options.notes || "",
    uploadedImage: options.uploadedImage || null,
    extractedText: options.extractedText || "",
    analysis: options.analysis || null,
    errorMessage: options.errorMessage || null,
    body: "pages/checker"
  });
}

exports.showChecker = (req, res) => {
  renderCheckerPage(res);
};

exports.showUploadError = (req, res, message) => {
  renderCheckerPage(res, {
    activeMode: "image",
    errorMessage: message || "The screenshot could not be uploaded. Please try again."
  });
};

exports.analyzeMessage = async (req, res) => {
  const activeMode = String(req.body.checkType || "text").trim();
  const notes = String(req.body.notes || "").trim();

  try {
    if (activeMode === "url") {
      await analyzeUrl(req, res, notes);
      return;
    }

    if (activeMode === "image") {
      await analyzeImage(req, res, notes);
      return;
    }

    await analyzeText(req, res, notes);
  } catch (error) {
    console.error("Scam detector analysis failed:", error.message);

    renderCheckerPage(res, {
      activeMode,
      submittedMessage: req.body.message || "",
      submittedUrl: req.body.url || "",
      notes,
      uploadedImage: req.file ? `/uploads/${req.file.filename}` : null,
      errorMessage: getFriendlyAnalysisError(error)
    });
  }
};

function buildAnalysisInput(primaryContent, notes) {
  if (!notes) {
    return primaryContent;
  }

  return `${primaryContent}\n\nAdditional notes from user:\n${notes}`;
}

async function analyzeText(req, res, notes) {
  const submittedMessage = String(req.body.message || "").trim();

  if (!submittedMessage) {
    renderCheckerPage(res, {
      activeMode: "text",
      notes,
      errorMessage: "Please paste suspicious text before checking it."
    });
    return;
  }

  const analysisInput = buildAnalysisInput(submittedMessage, notes);
  const analysis = await openaiService.analyzeText(analysisInput);

  n8nService.sendHighRiskAlert(analysis, analysisInput);

  renderCheckerPage(res, {
    activeMode: "text",
    submittedMessage,
    notes,
    analysis
  });
}

async function analyzeUrl(req, res, notes) {
  const submittedUrl = String(req.body.url || "").trim();

  if (!submittedUrl) {
    renderCheckerPage(res, {
      activeMode: "url",
      notes,
      errorMessage: "Please paste a suspicious URL before checking it."
    });
    return;
  }

  const analysisInput = buildAnalysisInput(submittedUrl, notes);
  const analysis = await openaiService.analyzeUrl(analysisInput);

  n8nService.sendHighRiskAlert(analysis, analysisInput);

  renderCheckerPage(res, {
    activeMode: "url",
    submittedUrl,
    notes,
    analysis
  });
}

async function analyzeImage(req, res, notes) {
  if (!req.file) {
    renderCheckerPage(res, {
      activeMode: "image",
      notes,
      errorMessage: "Please choose an image file before analyzing."
    });
    return;
  }

  const uploadedImage = `/uploads/${req.file.filename}`;
  const extractedText = await geminiService.extractTextFromImage(req.file.path, req.file.mimetype);
  const analysisInput = buildAnalysisInput(`Text extracted from uploaded image:\n${extractedText}`, notes);
  const analysis = await openaiService.analyzeText(analysisInput);

  n8nService.sendHighRiskAlert(analysis, analysisInput);

  renderCheckerPage(res, {
    activeMode: "image",
    uploadedImage,
    extractedText,
    notes,
    analysis
  });
}

function getFriendlyAnalysisError(error) {
  const message = error.message || "";

  if (message.includes("Gemini") || message.includes("GEMINI_API_KEY")) {
    return geminiService.getFriendlyGeminiError(error);
  }

  return openaiService.getFriendlyOpenAIError(error);
}


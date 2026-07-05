const pageModel = require("../models/pageModel");
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
    chatbotHandoffUrl: options.chatbotHandoffUrl || null,
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
  const analysis = await n8nService.requestScamAnalysis({
    checkType: "text",
    contentType: "text",
    content: analysisInput,
    message: submittedMessage,
    notes
  });

  n8nService.sendHighRiskAlert(analysis, analysisInput);

  renderCheckerPage(res, {
    activeMode: "text",
    submittedMessage,
    notes,
    analysis,
    chatbotHandoffUrl: buildChatbotHandoffUrl(analysis)
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
  const analysis = await n8nService.requestScamAnalysis({
    checkType: "url",
    contentType: "url",
    content: analysisInput,
    url: submittedUrl,
    notes
  });

  n8nService.sendHighRiskAlert(analysis, analysisInput);

  renderCheckerPage(res, {
    activeMode: "url",
    submittedUrl,
    notes,
    analysis,
    chatbotHandoffUrl: buildChatbotHandoffUrl(analysis)
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
  const analysis = await n8nService.requestScamAnalysis({
    checkType: "image",
    contentType: "image",
    content: notes,
    notes,
    uploadedImage,
    imageFile: req.file
  });
  const extractedText = analysis.extractedText || analysis.message || analysis.content || "";
  const alertContent = buildAnalysisInput(
    extractedText ? `Text extracted from uploaded image:\n${extractedText}` : "Uploaded image submitted for scam analysis.",
    notes
  );

  n8nService.sendHighRiskAlert(analysis, alertContent);

  renderCheckerPage(res, {
    activeMode: "image",
    uploadedImage,
    extractedText,
    notes,
    analysis,
    chatbotHandoffUrl: buildChatbotHandoffUrl(analysis)
  });
}

function buildChatbotHandoffUrl(analysis) {
  if (!isHighRiskAnalysis(analysis)) {
    return null;
  }

  const params = new URLSearchParams({
    riskLevel: analysis.riskLevel || "unknown",
    score: analysis.score === null || analysis.score === undefined ? "" : String(analysis.score),
    scamType: analysis.scamType || "unknown",
    redFlags: Array.isArray(analysis.redFlags) ? analysis.redFlags.join(", ") : String(analysis.redFlags || ""),
    recommendedAction: analysis.recommendedAction || ""
  });

  return `/chatbot?${params.toString()}`;
}

function isHighRiskAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") {
    return false;
  }

  const riskLevel = String(analysis.riskLevel || "").trim().toLowerCase();

  if (riskLevel === "high") {
    return true;
  }

  return typeof analysis.score === "number" && analysis.score >= 70;
}

function getFriendlyAnalysisError(error) {
  return n8nService.getFriendlyN8nError(error);
}


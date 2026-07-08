const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

function getBotpressConfig() {
  return {
    botName: "SparkleBot",
    webchatInjectUrl: process.env.BOTPRESS_WEBCHAT_INJECT_URL || "",
    webchatConfigUrl: process.env.BOTPRESS_WEBCHAT_CONFIG_URL || ""
  };
}

function getScamContext(query) {
  const hasRiskContext = Boolean(query.riskLevel || query.score || query.scamType || query.redFlags || query.recommendedAction);

  if (!hasRiskContext) {
    return null;
  }

  return {
    riskLevel: String(query.riskLevel || "unknown").trim(),
    score: String(query.score || "").trim(),
    scamType: String(query.scamType || "unknown").trim(),
    redFlags: String(query.redFlags || "").trim(),
    recommendedAction: String(query.recommendedAction || "").trim()
  };
}

exports.showChatbot = (req, res) => {
  const scamContext = getScamContext(req.query);

  res.render("layout", {
    title: "AI Chatbot",
    currentPage: "chatbot",
    page: pageModel.getPage("chatbot"),
    questions: pageModel.getChatbotQuestions(scamContext ? scamContext.scamType : ""),
    botpress: getBotpressConfig(),
    scamContext,
    body: "pages/chatbot"
  });
};

exports.submitRecommendedLearningContext = (req, res) => {
  const scamType = String(req.body.scamType || req.body.detectedScamType || req.body.scam_type || "unknown").trim();
  const learningPrompts = Array.isArray(req.body.learningPrompts) ? req.body.learningPrompts.map(String) : [];

  n8nService.sendRecommendedLearningContext({
    riskLevel: String(req.body.riskLevel || "").trim(),
    score: String(req.body.score || "").trim(),
    scamType,
    detectedScamType: scamType,
    scam_type: scamType,
    redFlags: String(req.body.redFlags || "").trim(),
    recommendedAction: String(req.body.recommendedAction || "").trim(),
    learningPrompts
  });

  res.json({ success: true });
};

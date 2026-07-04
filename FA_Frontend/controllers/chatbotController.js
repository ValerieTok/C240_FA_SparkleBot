const pageModel = require("../models/pageModel");
function getBotpressConfig() {
  return {
    botName: "SparkleBot",
    webchatInjectUrl: process.env.BOTPRESS_WEBCHAT_INJECT_URL || "",
    webchatConfigUrl: process.env.BOTPRESS_WEBCHAT_CONFIG_URL || ""
  };
}

function getScamContext(query) {
  const message = String(query.message || "").trim();

  if (!message) {
    return null;
  }

  const context = {
    riskLevel: String(query.riskLevel || "unknown").trim(),
    score: String(query.score || "").trim(),
    scamType: String(query.scamType || "unknown").trim(),
    redFlags: String(query.redFlags || "").trim(),
    recommendedAction: String(query.recommendedAction || "").trim(),
    message
  };

  context.prompt = [
    "Please help me understand this scam analysis and what I should do next.",
    "",
    `Risk level: ${context.riskLevel}`,
    context.score ? `Score: ${context.score}/100` : "",
    `Possible scam type: ${context.scamType}`,
    `Red flags: ${context.redFlags || "None returned"}`,
    `Recommended action: ${context.recommendedAction || "None returned"}`,
    "",
    "Submitted content:",
    context.message
  ].filter(Boolean).join("\n");

  return context;
}

exports.showChatbot = (req, res) => {
  res.render("layout", {
    title: "AI Chatbot",
    currentPage: "chatbot",
    page: pageModel.getPage("chatbot"),
    questions: pageModel.getChatbotQuestions(),
    botpress: getBotpressConfig(),
    scamContext: getScamContext(req.query),
    body: "pages/chatbot"
  });
};

const pageModel = require("../models/pageModel");
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

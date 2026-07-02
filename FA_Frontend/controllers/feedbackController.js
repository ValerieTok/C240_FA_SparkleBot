const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

exports.submitFeedback = (req, res) => {
  const rating = String(req.body.rating || "").trim();
  const page = String(req.body.page || "chatbot").trim();
  const comment = String(req.body.comment || "").trim();

  if (!["helpful", "not_helpful"].includes(rating)) {
    renderChatbotPage(res, {
      feedbackError: "Please choose Helpful or Not Helpful before submitting feedback."
    });
    return;
  }

  n8nService.sendFeedback({
    rating,
    page,
    comment: comment || "No comment provided"
  });

  renderChatbotPage(res, {
    feedbackMessage: "Thanks, your feedback was recorded."
  });
};

function renderChatbotPage(res, options = {}) {
  res.render("layout", {
    title: "AI Chatbot",
    currentPage: "chatbot",
    page: pageModel.getPage("chatbot"),
    questions: pageModel.getChatbotQuestions(),
    botpress: {
      botName: "SparkleBot",
      webchatInjectUrl: process.env.BOTPRESS_WEBCHAT_INJECT_URL || "",
      webchatConfigUrl: process.env.BOTPRESS_WEBCHAT_CONFIG_URL || ""
    },
    feedbackMessage: options.feedbackMessage || null,
    feedbackError: options.feedbackError || null,
    body: "pages/chatbot"
  });
}

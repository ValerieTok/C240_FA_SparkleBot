const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

function renderFeedbackPage(res, options = {}) {
  res.render("layout", {
    title: "Feedback",
    currentPage: "feedback",
    page: pageModel.getPage("feedback"),
    feedbackMessage: options.feedbackMessage || null,
    feedbackError: options.feedbackError || null,
    values: options.values || {},
    body: "pages/feedback"
  });
}

exports.showFeedback = (req, res) => {
  renderFeedbackPage(res);
};

exports.submitFeedback = (req, res) => {
  const rating = String(req.body.rating || "").trim();
  const page = String(req.body.page || "chatbot").trim();
  const comment = String(req.body.comment || "").trim();

  if (!["helpful", "not_helpful"].includes(rating)) {
    renderFeedbackPage(res, {
      feedbackError: "Please choose Helpful or Not Helpful before submitting feedback.",
      values: {
        page,
        comment
      }
    });
    return;
  }

  n8nService.sendFeedback({
    rating,
    page,
    comment: comment || "No comment provided"
  });

  renderFeedbackPage(res, {
    feedbackMessage: "Thanks, your feedback was recorded."
  });
};

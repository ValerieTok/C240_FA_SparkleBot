const pageModel = require("../models/pageModel");
const botpressService = require("../services/botpressService");

function renderCheckerPage(res, options = {}) {
  res.render("layout", {
    title: "Message Checker",
    currentPage: "checker",
    page: pageModel.getPage("checker"),
    submittedMessage: options.submittedMessage || "",
    analysis: options.analysis || null,
    errorMessage: options.errorMessage || null,
    body: "pages/checker"
  });
}

exports.showChecker = (req, res) => {
  renderCheckerPage(res);
};

exports.analyzeMessage = async (req, res) => {
  const submittedMessage = (req.body.message || "").trim();

  if (!submittedMessage) {
    renderCheckerPage(res, {
      errorMessage: "Please paste a suspicious message before checking it."
    });
    return;
  }

  try {
    const analysis = await botpressService.analyzeMessage(submittedMessage);

    renderCheckerPage(res, {
      submittedMessage,
      analysis
    });
  } catch (error) {
    console.error("Botpress message analysis failed:", error.message);

    renderCheckerPage(res, {
      submittedMessage,
      errorMessage: botpressService.getFriendlyBotpressError(error)
    });
  }
};

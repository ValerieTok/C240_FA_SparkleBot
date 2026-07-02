const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

function renderUploadPage(res, options = {}) {
  res.render("layout", {
    title: "Screenshot Upload",
    currentPage: "upload",
    page: pageModel.getPage("upload"),
    uploadedImage: null,
    extractedText: null,
    analysis: null,
    errorMessage: null,
    reportMessage: options.reportMessage || null,
    reportError: options.reportError || null,
    body: "pages/upload"
  });
}

exports.submitReport = (req, res) => {
  const scamType = String(req.body.scamType || "").trim();
  const platform = String(req.body.platform || "").trim();
  const message = String(req.body.message || "").trim();
  const contact = String(req.body.contact || "").trim();

  if (!scamType || !platform || !message) {
    renderUploadPage(res, {
      reportError: "Please fill in the scam type, platform, and scam details before submitting."
    });
    return;
  }

  n8nService.sendScamReport({
    scamType,
    platform,
    message,
    contact: contact || "Not provided"
  });

  renderUploadPage(res, {
    reportMessage: "Your scam report was submitted for review."
  });
};

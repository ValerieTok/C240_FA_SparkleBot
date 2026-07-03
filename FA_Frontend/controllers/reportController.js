const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

function renderReportPage(res, options = {}) {
  res.render("layout", {
    title: "Report Scam",
    currentPage: "report",
    page: pageModel.getPage("report"),
    reportMessage: options.reportMessage || null,
    reportError: options.reportError || null,
    values: options.values || {},
    body: "pages/report"
  });
}

exports.showReport = (req, res) => {
  renderReportPage(res);
};

exports.submitReport = (req, res) => {
  const scamType = String(req.body.scamType || "").trim();
  const platform = String(req.body.platform || "").trim();
  const message = String(req.body.message || "").trim();
  const contact = String(req.body.contact || "").trim();

  if (!scamType || !platform || !message) {
    renderReportPage(res, {
      reportError: "Please fill in the scam type, platform, and scam details before submitting.",
      values: {
        scamType,
        platform,
        message,
        contact
      }
    });
    return;
  }

  n8nService.sendScamReport({
    scamType,
    platform,
    message,
    contact: contact || "Not provided"
  });

  renderReportPage(res, {
    reportMessage: "Your scam report was submitted for review."
  });
};

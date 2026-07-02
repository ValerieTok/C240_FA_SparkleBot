const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

const suspiciousTerms = [
  { term: "otp", flag: "Requests or mentions an OTP" },
  { term: "password", flag: "Requests or mentions a password" },
  { term: "verify", flag: "Asks the user to verify information" },
  { term: "suspended", flag: "Claims an account is suspended" },
  { term: "locked", flag: "Claims an account is locked" },
  { term: "click", flag: "Asks the user to click a link" },
  { term: "urgent", flag: "Uses urgent language" },
  { term: "bank", flag: "References a bank or banking issue" },
  { term: "singpass", flag: "References Singpass" },
  { term: "paynow", flag: "References PayNow" },
  { term: "transfer", flag: "Requests or mentions a money transfer" },
  { term: "login", flag: "Asks the user to log in" }
];

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

exports.analyzeMessage = (req, res) => {
  const submittedMessage = (req.body.message || "").trim();

  if (!submittedMessage) {
    renderCheckerPage(res, {
      errorMessage: "Please paste a suspicious message before checking it."
    });
    return;
  }

  const analysis = analyzeMessageLocally(submittedMessage);

  n8nService.sendHighRiskAlert(analysis, submittedMessage);

  renderCheckerPage(res, {
    submittedMessage,
    analysis
  });
};

function analyzeMessageLocally(message) {
  const normalizedMessage = message.toLowerCase();
  const matchedTerms = suspiciousTerms.filter(({ term }) => normalizedMessage.includes(term));
  const uniqueRedFlags = [...new Set(matchedTerms.map(({ flag }) => flag))];
  const riskLevel = getRiskLevel(matchedTerms.length);

  return {
    riskLevel,
    scamType: getScamType(normalizedMessage, matchedTerms),
    redFlags: uniqueRedFlags.length ? uniqueRedFlags : ["No obvious scam keywords detected"],
    recommendedAction: getRecommendedAction(riskLevel)
  };
}

function getRiskLevel(matchCount) {
  if (matchCount >= 3) {
    return "High";
  }

  if (matchCount > 0) {
    return "Medium";
  }

  return "Low";
}

function getScamType(message, matchedTerms) {
  const matchedTermNames = matchedTerms.map(({ term }) => term);

  if (
    matchedTermNames.some((term) => ["otp", "password", "verify", "login"].includes(term)) ||
    message.includes("http")
  ) {
    return "Phishing";
  }

  if (matchedTermNames.some((term) => ["paynow", "transfer"].includes(term))) {
    return "Payment scam";
  }

  if (matchedTermNames.some((term) => ["bank", "singpass"].includes(term))) {
    return "Impersonation scam";
  }

  return "Unknown";
}

function getRecommendedAction(riskLevel) {
  if (riskLevel === "High") {
    return "Do not click links, share OTPs or passwords, transfer money, or reply. Verify through the official organisation's website or hotline.";
  }

  if (riskLevel === "Medium") {
    return "Be cautious. Do not share personal information and verify the message through official channels before acting.";
  }

  return "No obvious scam keywords were found, but stay cautious and verify unexpected requests through official channels.";
}


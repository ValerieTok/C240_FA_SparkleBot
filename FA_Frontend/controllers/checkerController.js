const pageModel = require("../models/pageModel");

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

  sendN8nHighRiskAlert(analysis, submittedMessage);

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

function sendN8nHighRiskAlert(analysis, userMessage) {
  const webhookUrl = process.env.N8N_HIGH_RISK_WEBHOOK_URL?.trim();

  if (!isHighRiskAnalysis(analysis)) {
    return;
  }

  if (!webhookUrl) {
    console.error("n8n high-risk alert failed: N8N_HIGH_RISK_WEBHOOK_URL is missing.");
    return;
  }

  // n8n integration: send high-risk Message Checker cases in the background.
  // This promise is intentionally not awaited so the user still sees the analysis
  // even if the n8n webhook is slow or unavailable.
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      riskLevel: "High",
      scamType: "Phishing",
      platform: "Message Checker",
      message: userMessage
    })
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(getN8nWebhookErrorMessage(response.status, webhookUrl));
      }
    })
    .catch((error) => {
      console.error("n8n high-risk alert failed:", error.message || error);
    });
}

function getN8nWebhookErrorMessage(status, webhookUrl) {
  if (status === 404 && webhookUrl.includes("/webhook-test/")) {
    return [
      "n8n webhook returned HTTP 404.",
      "The test webhook only works while n8n is listening for a test event.",
      "Click 'Listen for test event' in n8n before submitting the checker form, or use the production /webhook/ URL with an active workflow."
    ].join(" ");
  }

  return `n8n webhook returned HTTP ${status}`;
}

function isHighRiskAnalysis(analysis) {
  const riskLevel = getAnalysisValue(analysis, "riskLevel").toLowerCase();

  if (riskLevel === "high") {
    return true;
  }

  const riskText = stringifyAnalysis(analysis).toLowerCase();

  return (
    riskText.includes("scam risk: high") ||
    riskText.includes("risk level: high") ||
    riskText.includes("high risk")
  );
}

function getAnalysisValue(analysis, key) {
  if (!analysis || typeof analysis !== "object") {
    return "";
  }

  return String(analysis[key] || "").trim();
}

function stringifyAnalysis(analysis) {
  if (typeof analysis === "string") {
    return analysis;
  }

  if (!analysis || typeof analysis !== "object") {
    return "";
  }

  return [
    analysis.riskLevel,
    analysis.scamType,
    Array.isArray(analysis.redFlags) ? analysis.redFlags.join(" ") : analysis.redFlags,
    analysis.recommendedAction
  ]
    .filter(Boolean)
    .join(" ");
}

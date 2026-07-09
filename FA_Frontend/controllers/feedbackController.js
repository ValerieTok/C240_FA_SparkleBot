const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

const emptyFeedbackAnalytics = {
  totalSubmissions: 0,
  helpfulPercentage: 0,
  helpful: 0,
  notHelpful: 0,
  liveFeed: []
};

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

exports.getFeedbackDashboard = async (req, res) => {
  const { analytics, errorMessage } = await getFeedbackAnalytics();

  res.render("layout", {
    title: "Feedback Dashboard",
    currentPage: "feedback-dashboard",
    page: pageModel.getPage("feedbackDashboard") || {
      heading: "Feedback Dashboard",
      description: "Review live feedback signals from n8n."
    },
    analytics,
    feedbackDashboardError: errorMessage,
    body: "pages/feedback-dashboard"
  });
};

async function getFeedbackAnalytics() {
  const webhookUrl = String(process.env.N8N_GET_FEEDBACK_ANALYTICS_URL || "").trim();

  if (!webhookUrl) {
    return {
      analytics: { ...emptyFeedbackAnalytics },
      errorMessage:
        "n8n feedback analytics webhook is missing. Add N8N_GET_FEEDBACK_ANALYTICS_URL to your .env file."
    };
  }

  try {
    const response = await requestFeedbackAnalytics(webhookUrl);

    const responseText = await response.text();
    const rawAnalytics = parseAnalyticsResponse(responseText);

    return {
      analytics: normalizeFeedbackAnalytics(rawAnalytics),
      errorMessage: null
    };
  } catch (error) {
    console.error("n8n feedback dashboard failed:", error.message);

    return {
      analytics: { ...emptyFeedbackAnalytics },
      errorMessage: getFriendlyFeedbackError(error)
    };
  }
}

async function requestFeedbackAnalytics(webhookUrl) {
  const initialResponse = await fetchWebhook(webhookUrl);

  if (initialResponse.ok) {
    return initialResponse;
  }

  if (initialResponse.status === 404 && webhookUrl.includes("/webhook-test/")) {
    const productionWebhookUrl = webhookUrl.replace("/webhook-test/", "/webhook/");
    const fallbackResponse = await fetchWebhook(productionWebhookUrl);

    if (fallbackResponse.ok) {
      return fallbackResponse;
    }

    throw new Error(getWebhookErrorMessage(fallbackResponse.status, productionWebhookUrl));
  }

  throw new Error(getWebhookErrorMessage(initialResponse.status, webhookUrl));
}

function fetchWebhook(url) {
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });
}

function parseAnalyticsResponse(responseText) {
  const trimmedText = String(responseText || "").trim();

  if (!trimmedText) {
    throw new Error("n8n feedback analytics returned an empty response.");
  }

  const parsed = JSON.parse(trimmedText);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!result || typeof result !== "object") {
    throw new Error("n8n feedback analytics returned an unsupported response.");
  }

  return result.json && typeof result.json === "object" ? result.json : result;
}

function normalizeFeedbackAnalytics(data) {
  const helpful = toNumber(data.helpful ?? data.helpfulCount ?? data.helpful_count);
  const notHelpful = toNumber(data.notHelpful ?? data.not_helpful ?? data.notHelpfulCount ?? data.not_helpful_count);
  const totalFromResponse = toNumber(data.totalSubmissions ?? data.total_submissions);
  const computedTotal = helpful + notHelpful;
  const totalSubmissions = totalFromResponse > 0 ? totalFromResponse : computedTotal;
  const helpfulPercentageRaw = toNumber(data.helpfulPercentage ?? data.helpful_percentage);
  const helpfulPercentage = clampPercentage(
    helpfulPercentageRaw > 0 || totalSubmissions === 0
      ? helpfulPercentageRaw
      : totalSubmissions > 0
        ? (helpful / totalSubmissions) * 100
        : 0
  );

  return {
    totalSubmissions,
    helpfulPercentage,
    helpful,
    notHelpful,
    liveFeed: normalizeLiveFeed(data.liveFeed ?? data.live_feed)
  };
}

function normalizeLiveFeed(liveFeed) {
  if (!Array.isArray(liveFeed)) {
    return [];
  }

  return liveFeed
    .map((item) => {
      const comment = toText(item.comment ?? item.feedback ?? item.message ?? item.userComment, "No comment provided.");
      const aiSummary = toText(item.aiSummary ?? item.ai_summary ?? item.summary ?? item.actionSummary, "No AI summary available.");
      const rawStatus = toText(item.status ?? item.rating ?? item.sentiment, "Unknown").toLowerCase();

      return {
        comment,
        aiSummary,
        statusLabel: getStatusLabel(rawStatus),
        statusClass: getStatusClass(rawStatus),
        submittedAt: toText(item.submittedAt ?? item.submitted_at ?? item.timestamp ?? item.date, "")
      };
    })
    .filter((item) => item.comment || item.aiSummary);
}

function getStatusLabel(status) {
  if (status.includes("not") && status.includes("help")) {
    return "Not Helpful";
  }

  if (status.includes("help")) {
    return "Helpful";
  }

  if (status.includes("neutral") || status.includes("mixed")) {
    return "Mixed";
  }

  return "Unknown";
}

function getStatusClass(status) {
  if (status.includes("not") && status.includes("help")) {
    return "negative";
  }

  if (status.includes("help")) {
    return "positive";
  }

  if (status.includes("neutral") || status.includes("mixed")) {
    return "neutral";
  }

  return "unknown";
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value))));
}

function toText(value, fallback) {
  const text = String(value || "").trim();

  return text || fallback;
}

function getFriendlyFeedbackError(error) {
  const message = String(error.message || "");

  if (message.includes("webhook-test") || message.includes("HTTP 404")) {
    return "n8n feedback analytics webhook is not listening. Use the production /webhook/ URL with an active workflow, or click 'Listen for test event' in n8n. Showing default values for now.";
  }

  if (message.includes("HTTP")) {
    return "n8n feedback analytics is unavailable right now. The dashboard is showing default values.";
  }

  if (message.includes("empty response") || message.includes("unsupported response") || message.includes("JSON")) {
    return "n8n feedback analytics did not return valid dashboard JSON. Showing default values.";
  }

  return "Feedback analytics could not be loaded. Showing default values for now.";
}

function getWebhookErrorMessage(status, webhookUrl) {
  if (status === 404 && webhookUrl.includes("/webhook-test/")) {
    return [
      "n8n feedback analytics webhook returned HTTP 404.",
      "The test webhook only works while n8n is listening for a test event.",
      "Click 'Listen for test event' in n8n, or use the production /webhook/ URL with an active workflow."
    ].join(" ");
  }

  return `n8n feedback analytics webhook returned HTTP ${status}`;
}

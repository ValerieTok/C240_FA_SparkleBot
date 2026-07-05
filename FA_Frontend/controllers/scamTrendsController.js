const pageModel = require("../models/pageModel");

const emptyTrendData = {
  totalReports: 0,
  mostCommonScamType: "None",
  mostCommonScamCount: 0,
  highRiskReports: 0,
  mediumRiskReports: 0,
  lowRiskReports: 0,
  topScamTypes: [],
  trendSummary: "Scam trend data is not available yet.",
  dateGenerated: "Not available"
};

exports.showDashboard = async (req, res) => {
  const { trends, errorMessage } = await getScamTrendData();
  const riskBreakdown = buildRiskBreakdown(trends);

  res.render("layout", {
    title: "Scam Trends Dashboard",
    currentPage: "scam-trends",
    page: pageModel.getPage("scamTrends"),
    trends,
    riskBreakdown,
    trendsError: errorMessage,
    body: "pages/scam-trends"
  });
};

async function getScamTrendData() {
  const webhookUrl = String(process.env.N8N_SCAM_TRENDS_WEBHOOK_URL || "").trim();

  if (!webhookUrl) {
    return {
      trends: {
        ...emptyTrendData,
        trendSummary: "N8N_SCAM_TRENDS_WEBHOOK_URL is not configured."
      },
      errorMessage: "n8n scam trends webhook is missing. Add N8N_SCAM_TRENDS_WEBHOOK_URL to your .env file."
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(getWebhookErrorMessage(response.status, webhookUrl));
    }

    const responseText = await response.text();
    const rawTrendData = parseTrendResponse(responseText);

    return {
      trends: normalizeTrendData(rawTrendData),
      errorMessage: null
    };
  } catch (error) {
    console.error("n8n scam trends dashboard failed:", error.message);

    return {
      trends: {
        ...emptyTrendData,
        trendSummary: "Scam trend data could not be loaded from n8n."
      },
      errorMessage: getFriendlyTrendError(error)
    };
  }
}

function parseTrendResponse(responseText) {
  const trimmedText = String(responseText || "").trim();

  if (!trimmedText) {
    throw new Error("n8n scam trends returned an empty response.");
  }

  const parsed = JSON.parse(trimmedText);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!result || typeof result !== "object") {
    throw new Error("n8n scam trends returned an unsupported response.");
  }

  return result.json && typeof result.json === "object" ? result.json : result;
}

function normalizeTrendData(data) {
  const totalReports = toNumber(data.totalReports ?? data.total_reports);
  const highRiskReports = toNumber(data.highRiskReports ?? data.high_risk_reports);
  const mediumRiskReports = toNumber(data.mediumRiskReports ?? data.medium_risk_reports);
  const lowRiskReports = toNumber(data.lowRiskReports ?? data.low_risk_reports);
  const mostCommonScamCount = toNumber(data.mostCommonScamCount ?? data.most_common_scam_count);
  const mostCommonScamType = toText(data.mostCommonScamType ?? data.most_common_scam_type, "None");
  const topScamTypes = normalizeTopScamTypes(data.topScamTypes ?? data.top_scam_types);

  return {
    totalReports,
    mostCommonScamType,
    mostCommonScamCount,
    highRiskReports,
    mediumRiskReports,
    lowRiskReports,
    topScamTypes: topScamTypes.length
      ? topScamTypes
      : buildFallbackTopScamTypes(mostCommonScamType, mostCommonScamCount),
    trendSummary: toText(data.trendSummary ?? data.trend_summary, "No trend summary returned."),
    dateGenerated: toText(data.dateGenerated ?? data.date_generated, "Not available")
  };
}

function normalizeTopScamTypes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      label: toText(item.label ?? item.scamType ?? item.scam_type ?? item.type, ""),
      count: toNumber(item.count ?? item.total ?? item.reports)
    }))
    .filter((item) => item.label && item.count > 0);
}

function buildFallbackTopScamTypes(mostCommonScamType, mostCommonScamCount) {
  if (!mostCommonScamType || mostCommonScamType === "None" || mostCommonScamCount <= 0) {
    return [];
  }

  return [
    {
      label: mostCommonScamType,
      count: mostCommonScamCount
    }
  ];
}

function buildRiskBreakdown(trends) {
  return [
    {
      label: "High Risk",
      count: trends.highRiskReports,
      className: "high"
    },
    {
      label: "Medium Risk",
      count: trends.mediumRiskReports,
      className: "medium"
    },
    {
      label: "Low Risk",
      count: trends.lowRiskReports,
      className: "low"
    }
  ].map((item) => ({
    ...item,
    percentage: trends.totalReports
      ? Math.round((item.count / trends.totalReports) * 100)
      : 0
  }));
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function toText(value, fallback) {
  const text = String(value || "").trim();

  return text || fallback;
}

function getWebhookErrorMessage(status, webhookUrl) {
  if (status === 404 && webhookUrl.includes("/webhook-test/")) {
    return [
      "n8n scam trends webhook returned HTTP 404.",
      "The test webhook only works while n8n is listening for a test event.",
      "Click 'Listen for test event' in n8n, or use the production /webhook/ URL with an active workflow."
    ].join(" ");
  }

  return `n8n scam trends webhook returned HTTP ${status}`;
}

function getFriendlyTrendError(error) {
  const message = error.message || "";

  if (message.includes("webhook-test") || message.includes("HTTP 404")) {
    return "n8n scam trends webhook is not listening. Use the production webhook URL with an active workflow, or click 'Listen for test event' in n8n.";
  }

  if (message.includes("empty response") || message.includes("unsupported response") || message.includes("JSON")) {
    return "n8n scam trends did not return valid dashboard JSON.";
  }

  return "n8n scam trends data is unavailable right now. Please check the workflow and try again.";
}

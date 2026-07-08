const { Client } = require("@botpress/chat");
const JSON5 = require("json5");
const DEFAULT_TIMEOUT_MS = 15000;
const CHAT_API_HOST = "chat.botpress.cloud";

function getBotpressConfig() {
  const webhookValue = (
    process.env.BOTPRESS_CHAT_WEBHOOK_ID ||
    process.env.BOTPRESS_CHAT_WEBHOOK_URL ||
    process.env.BOTPRESS_WEBHOOK_ID ||
    ""
  ).trim();

  if (!webhookValue) {
    throw new Error("BOTPRESS_CHAT_WEBHOOK_ID missing.");
  }

  return { webhookId: getChatWebhookId(webhookValue) };
}

function getChatWebhookId(value) {
  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  const url = new URL(value);

  if (url.hostname !== CHAT_API_HOST) {
    throw new Error("BOTPRESS_CHAT_WEBHOOK_ID must come from the Botpress Chat Integration webhook URL.");
  }

  const [webhookId] = url.pathname.split("/").filter(Boolean);

  if (!webhookId) {
    throw new Error("BOTPRESS_CHAT_WEBHOOK_ID missing.");
  }

  return webhookId;
}

async function analyzeMessage(message) {
  const { webhookId } = getBotpressConfig();
  const client = await withTimeout(
    Client.connect({ webhookId, timeout: DEFAULT_TIMEOUT_MS }),
    DEFAULT_TIMEOUT_MS
  );
  const botReply = await sendPrompt(client, buildAnalysisPrompt(message));
  let parsed = parseBotpressAnalysis(botReply);

  if (!isCompleteAnalysis(parsed)) {
    parsed = inferFallbackAnalysis(message, botReply);
  }

  return normalizeAnalysis(parsed);
}

async function sendPrompt(client, text) {
  const { conversation } = await withTimeout(
    client.createConversation({}),
    DEFAULT_TIMEOUT_MS
  );

  await withTimeout(
    client.createMessage({
      conversationId: conversation.id,
      payload: {
        type: "text",
        text
      }
    }),
    DEFAULT_TIMEOUT_MS
  );

  const botReply = await waitForBotReply(client, conversation.id);
  return botReply;
}

async function waitForBotReply(client, conversationId) {
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
  let firstReplySeenAt = null;
  let latestReply = "";

  while (Date.now() < deadline) {
    const response = await withTimeout(
      client.listMessages({ conversationId }),
      Math.max(1, deadline - Date.now())
    );
    const replies = [...response.messages]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((candidate) => candidate.userId !== client.user.id && getMessageText(candidate));
    const completedReply = replies.find((candidate) => looksLikeCompletedAnalysis(getMessageText(candidate)));

    if (completedReply) {
      return getMessageText(completedReply);
    }

    if (replies.length) {
      firstReplySeenAt ||= Date.now();
      latestReply = getMessageText(replies[0]);

      // Allow time for a preliminary message to be followed by the actual analysis.
      if (Date.now() - firstReplySeenAt >= 5000) {
        return latestReply;
      }
    }

    await delay(1000);
  }

  throw new Error("Botpress response timed out.");
}

function withTimeout(promise, timeoutMs) {
  let timeout;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Botpress response timed out.")), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function buildAnalysisPrompt(message) {
  return [
    "Analyze the following suspicious message using the bot's configured scam knowledge base and RAG retrieval.",
    "If retrieval has no exact match, complete the assessment using general scam-prevention knowledge.",
    "Do not refuse the assessment merely because the knowledge base has no specific information.",
    "Return only one valid JSON object with exactly these fields: riskLevel, scamType, redFlags, recommendedAction.",
    "riskLevel must be one of Low, Medium, High, or Unclear. Use Unclear only when the supplied message itself lacks enough information, not when retrieval has no match.",
    "Use double quotes around every property name and string. redFlags must be an array of strings.",
    "Do not use Markdown code fences or add explanatory text outside the JSON object.",
    "",
    message
  ].join("\n");
}

function isCompleteAnalysis(result) {
  const riskLevel = String(result?.riskLevel || "").trim().toLowerCase();
  const scamType = String(result?.scamType || "").trim().toLowerCase();

  return (
    riskLevel &&
    riskLevel !== "unclear" &&
    scamType &&
    scamType !== "unclear" &&
    Array.isArray(result.redFlags) &&
    result.redFlags.length > 0
  );
}

function inferFallbackAnalysis(message, previousReply) {
  const source = `${message}\n${previousReply}`.toLowerCase();
  const redFlags = [];

  addRedFlag(redFlags, /urgent|immediately|act now|limited time|account.*(?:locked|suspended)/i, source, "Urgent or threatening language");
  addRedFlag(redFlags, /gift card|processing fee|upfront fee|transfer money|make payment|pay\b/i, source, "Request for payment or an upfront fee");
  addRedFlag(redFlags, /password|otp|one[- ]time password|bank details|personal information/i, source, "Request for sensitive personal or banking information");
  addRedFlag(redFlags, /https?:\/\/|click (?:the |this )?link|scan (?:the |this )?qr/i, source, "Suspicious link or request to leave an official channel");
  addRedFlag(redFlags, /you (?:have )?won|prize|guaranteed return|too good to be true/i, source, "Unexpected reward or unrealistic promise");
  addRedFlag(redFlags, /police|government|bank officer|authority|impersonat/i, source, "Possible impersonation of a trusted organisation or authority");

  let scamType = "Unclear";
  if (/you (?:have )?won|prize|processing fee|upfront fee/i.test(source)) {
    scamType = "Advance-fee scam";
  } else if (/police|government|bank officer|authority|impersonat/i.test(source)) {
    scamType = "Impersonation scam";
  } else if (/password|otp|bank details|account.*(?:locked|suspended)|click (?:the |this )?link/i.test(source)) {
    scamType = "Phishing scam";
  } else if (/job offer|recruiter|task scam|commission/i.test(source)) {
    scamType = "Job or task scam";
  } else if (/investment|crypto|guaranteed return/i.test(source)) {
    scamType = "Investment scam";
  }

  const riskLevel = redFlags.length >= 2 || /do not (?:respond|pay|transfer|click)|several red flags/i.test(source)
    ? "High"
    : redFlags.length === 1
      ? "Medium"
      : "Unclear";
  const cleanedReply = String(previousReply || "")
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const usefulRecommendation = cleanedReply && !/^\s*(?:<[^>]*>)+\s*$/i.test(cleanedReply)
    ? cleanedReply
    : "Do not respond, click links, disclose information, or make payment. Verify the claim through the organisation's official contact details.";

  return {
    riskLevel,
    scamType,
    redFlags,
    recommendedAction: usefulRecommendation
  };
}

function addRedFlag(redFlags, pattern, source, description) {
  if (pattern.test(source)) {
    redFlags.push(description);
  }
}

function parseBotpressAnalysis(replyText) {
  const trimmed = replyText
    .trim()
    .replace(/^```(?:json|json5)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const candidates = [trimmed];
  const extracted = extractJsonObject(trimmed, false);

  if (extracted && extracted !== trimmed) {
    candidates.push(extracted);
  }

  if (extracted?.startsWith("{{") && extracted.endsWith("}}")) {
    candidates.push(extracted.slice(1, -1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON5.parse(candidate);
      } catch {
        // Try the next normalized representation.
      }
    }
  }

  return parseLabeledAnalysis(trimmed);
}

function extractJsonObject(text, required = true) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    if (required) {
      throw new Error("Botpress did not return structured JSON.");
    }

    return null;
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function looksLikeCompletedAnalysis(text) {
  return (
    Boolean(extractJsonObject(text, false)) ||
    (/risk\s*level\s*:/i.test(text) && /recommended\s*action\s*:/i.test(text))
  );
}

function parseLabeledAnalysis(text) {
  const riskLevel = text.match(/risk\s*level\s*:\s*([^\r\n]+)/i)?.[1]?.trim();
  const scamType = text.match(/(?:possible\s+)?scam\s*type\s*:\s*([^\r\n]+)/i)?.[1]?.trim();
  const redFlagsBlock = text.match(/red\s*flags?\s*:\s*([\s\S]*?)(?=recommended\s*action\s*:|$)/i)?.[1]?.trim();
  const recommendedAction = text.match(/recommended\s*action\s*:\s*([\s\S]+)/i)?.[1]?.trim();
  const redFlags = redFlagsBlock
    ? redFlagsBlock
        .split(/\r?\n|,(?=\s*[A-Z])/)
        .map((flag) => flag.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean)
    : [];

  return {
    riskLevel: riskLevel || "Unclear",
    scamType: scamType || "Unclear",
    redFlags,
    recommendedAction: recommendedAction || text
  };
}

function normalizeAnalysis(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Botpress returned an invalid result.");
  }

  return {
    riskLevel: String(result.riskLevel || "Unclear"),
    scamType: String(result.scamType || "Unclear"),
    redFlags: Array.isArray(result.redFlags) ? result.redFlags.map(String) : [],
    recommendedAction: String(result.recommendedAction || "Verify through official channels before taking action.")
  };
}

function getMessageText(message) {
  return (
    message.text ||
    message.payload?.text ||
    message.payload?.payload?.text ||
    message.content?.text ||
    message.payload?.markdown ||
    ""
  ).trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFriendlyBotpressError(error) {
  const message = error.message || "";

  if (error.name === "AbortError" || message.includes("timed out")) {
    return "Botpress took too long to respond. Please try again.";
  }

  if (message.includes("Botpress Chat Integration webhook URL")) {
    return [
      "Botpress Chat API is configured with the wrong URL.",
      "Use the Chat Integration webhook URL from Botpress Cloud for BOTPRESS_CHAT_WEBHOOK_ID or BOTPRESS_CHAT_WEBHOOK_URL."
    ].join(" ");
  }

  if (message.includes("BOTPRESS_CHAT_WEBHOOK_ID")) {
    return "Botpress Chat API is not configured yet. Add BOTPRESS_CHAT_WEBHOOK_ID from the Botpress Chat Integration webhook URL to your .env file.";
  }

  if (message.includes("Failed to connect to url")) {
    return [
      "Botpress could not find the configured webhook.",
      "Set BOTPRESS_CHAT_WEBHOOK_ID to the ID from your Botpress Chat Integration webhook URL, not the Webchat Config URL or Inject URL."
    ].join(" ");
  }

  if (message.includes("structured JSON") || message.includes("invalid result") || message.includes("parseable")) {
    return "Botpress replied, but not in the expected result format.";
  }

  return "Botpress analysis is unavailable right now. Please try again later.";
}

module.exports = {
  analyzeMessage,
  getFriendlyBotpressError
};

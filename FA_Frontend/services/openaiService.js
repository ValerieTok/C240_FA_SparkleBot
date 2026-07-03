const DEFAULT_MODEL = "gpt-4.1-mini";
const RESPONSES_URL = "https://api.openai.com/v1/responses";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    riskLevel: {
      type: "string",
      enum: ["Low", "Medium", "High", "Unclear"]
    },
    scamType: {
      type: "string"
    },
    redFlags: {
      type: "array",
      items: {
        type: "string"
      }
    },
    recommendedAction: {
      type: "string"
    }
  },
  required: ["riskLevel", "scamType", "redFlags", "recommendedAction"]
};

async function analyzeText(content) {
  return requestAnalysis([
    {
      type: "input_text",
      text: buildPrompt("text", content)
    }
  ]);
}

async function analyzeUrl(url) {
  return requestAnalysis([
    {
      type: "input_text",
      text: buildPrompt("URL", url)
    }
  ]);
}

async function requestAnalysis(content) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing.");
  }

  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: [
        "You are a scam-risk analyst for a public anti-scam website.",
        "Analyze only the submitted content and avoid inventing facts.",
        "Classify risk conservatively when there are signs of phishing, impersonation, payment pressure, fake jobs, investment fraud, malware, credential theft, or requests for sensitive information.",
        "Return the structured fields exactly as requested."
      ].join(" "),
      input: [
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "scam_risk_analysis",
          strict: true,
          schema: analysisSchema
        }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(response.status, payload));
  }

  return normalizeAnalysis(parseAnalysisPayload(payload));
}

function buildPrompt(contentType, content) {
  return [
    `Analyze this suspicious ${contentType} for scam risk.`,
    "Return only the required structured analysis.",
    "",
    String(content || "").trim()
  ].join("\n");
}

function parseAnalysisPayload(payload) {
  const text =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .find((part) => part.type === "output_text")?.text;

  if (!text) {
    throw new Error("OpenAI did not return analysis text.");
  }

  return JSON.parse(text);
}

function normalizeAnalysis(result) {
  return {
    riskLevel: String(result.riskLevel || "Unclear"),
    scamType: String(result.scamType || "Unclear"),
    redFlags: Array.isArray(result.redFlags) ? result.redFlags.map(String) : [],
    recommendedAction: String(result.recommendedAction || "Verify through official channels before taking action.")
  };
}

function getOpenAIErrorMessage(status, payload) {
  const message = payload?.error?.message || payload?.message || "OpenAI analysis failed.";
  return `OpenAI returned HTTP ${status}: ${message}`;
}

function getFriendlyOpenAIError(error) {
  const message = error.message || "";

  if (message.includes("OPENAI_API_KEY")) {
    return "OpenAI API key is missing. Add OPENAI_API_KEY to your .env file.";
  }

  if (message.includes("HTTP 401")) {
    return "OpenAI rejected the configured API key. Please check OPENAI_API_KEY in your .env file.";
  }

  if (message.includes("HTTP 429")) {
    return "OpenAI is rate limited right now. Please wait a minute and try again.";
  }

  if (message.includes("HTTP 400")) {
    return "OpenAI could not analyze this submission. Please try a clearer message, URL, or image.";
  }

  return "OpenAI scam analysis is unavailable right now. Please try again later.";
}

module.exports = {
  analyzeText,
  analyzeUrl,
  getFriendlyOpenAIError
};

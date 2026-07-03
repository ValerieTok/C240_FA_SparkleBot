const fs = require("fs");

const DEFAULT_MODEL = "gemini-2.5-flash";

async function extractTextFromImage(imagePath, mimeType) {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing.");
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: [
                "Extract only the readable text from this image.",
                "Preserve URLs, phone numbers, account names, amounts, dates, and suspicious instructions.",
                "If there is no readable text, return: No readable text found."
              ].join(" ")
            },
            {
              inlineData: {
                mimeType,
                data: imageBuffer.toString("base64")
              }
            }
          ]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getGeminiErrorMessage(response.status, payload));
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini did not return extracted text.");
  }

  return text;
}

function getGeminiErrorMessage(status, payload) {
  const message = payload?.error?.message || "Gemini OCR failed.";
  return `Gemini returned HTTP ${status}: ${message}`;
}

function getFriendlyGeminiError(error) {
  const message = error.message || "";

  if (message.includes("GEMINI_API_KEY")) {
    return "Gemini API key is missing. Add GEMINI_API_KEY to your .env file.";
  }

  if (message.includes("HTTP 400")) {
    return "Gemini could not read this image. Please upload a clearer screenshot.";
  }

  if (message.includes("HTTP 404")) {
    return "The configured Gemini model is not available. Use gemini-2.5-flash or another model that supports image input and generateContent.";
  }

  if (message.includes("HTTP 401") || message.includes("HTTP 403")) {
    return "Gemini rejected the configured API key. Please check GEMINI_API_KEY in your .env file.";
  }

  if (message.includes("HTTP 429")) {
    return "Gemini is rate limited right now. Please wait a minute and try again.";
  }

  if (message.includes("HTTP 503")) {
    return "Gemini OCR is temporarily unavailable. Please try again later.";
  }

  return "Gemini could not extract text from this image right now. Please try again later.";
}

module.exports = {
  extractTextFromImage,
  getFriendlyGeminiError
};

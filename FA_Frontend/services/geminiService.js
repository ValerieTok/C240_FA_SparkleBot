const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const extractionPrompt =
  "Extract all visible text from this screenshot. The image may contain an SMS, WhatsApp message, email, job offer, banking alert, or scam message. Return only the extracted text.";

function getGeminiModels() {
  return ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
}

async function extractTextFromImage(imagePath, mimeType) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = getGeminiModels();
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Image
            }
          },
          {
            text: extractionPrompt
          }
        ]
      });

      return (response.text || "").trim();
    } catch (error) {
      if (isTemporaryModelError(error) && model !== models[models.length - 1]) {
        continue;
      }

      throw error;
    }
  }

  return "";
}

function isTemporaryModelError(error) {
  const message = error.message || "";

  return /"code"\s*:\s*503/.test(message) || /"status"\s*:\s*"UNAVAILABLE"/.test(message);
}

function getFriendlyGeminiError(error) {
  const message = error.message || "";

  if (/"code"\s*:\s*429/.test(message) || /"status"\s*:\s*"RESOURCE_EXHAUSTED"/.test(message)) {
    return "Gemini is rate limited right now. Please wait a minute before uploading another screenshot.";
  }

  if (/"code"\s*:\s*503/.test(message) || /"status"\s*:\s*"UNAVAILABLE"/.test(message)) {
    return "Gemini is experiencing high demand right now. Please try again later.";
  }

  if (/"code"\s*:\s*404/.test(message) || /"status"\s*:\s*"NOT_FOUND"/.test(message)) {
    return "The configured Gemini OCR model is not available.";
  }

  if (message.includes("GEMINI_API_KEY is missing")) {
    return "Gemini API key is missing. Please add GEMINI_API_KEY to your .env file.";
  }

  return "Sorry, the image could not be analyzed right now. Please try again later.";
}

module.exports = {
  extractTextFromImage,
  getFriendlyGeminiError
};

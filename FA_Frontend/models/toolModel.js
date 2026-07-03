const tools = [
  {
    name: "Botpress",
    purpose: "Creates the future RAG chatbot and stores the chatbot knowledge base."
  },
  {
    name: "Google AI Studio / Gemini",
    purpose: "Extracts readable text from uploaded screenshots before scam risk analysis."
  },
  {
    name: "NotebookLM",
    purpose: "Helps organize trusted scam education sources and summarize knowledge for learning."
  },
  {
    name: "Ollama",
    purpose: "Allows local AI model experiments for privacy-friendly prototype testing."
  },
  {
    name: "GitHub Copilot",
    purpose: "Assists developers with code suggestions while building the web application."
  }
];

const aiStructures = [
  {
    name: "Semantic Search",
    explanation:
      "Finds information by meaning instead of only matching exact words, helping users locate related scam advice."
  },
  {
    name: "Retrieval-Augmented Generation",
    explanation:
      "Retrieves trusted knowledge first, then uses an AI model to answer based on that context."
  },
  {
    name: "Explainable AI",
    explanation:
      "Shows reasons behind a risk result, such as red flags and recommended actions, so users can understand the decision."
  }
];

exports.getTools = () => tools;
exports.getAiStructures = () => aiStructures;

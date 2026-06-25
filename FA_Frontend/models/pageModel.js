const pages = {
  home: {
    heading: "SparkleBot",
    tagline: "Think Before You Click",
    description:
      "An AI-powered anti-scam portal that helps users check suspicious messages, review screenshots, and get practical scam guidance from SparkleBot."
  },
  checker: {
    heading: "Message Checker",
    description:
      "Paste a suspicious message and send it to the connected Botpress chatbot for scam risk analysis."
  },
  upload: {
    heading: "Screenshot Upload",
    description:
      "Upload a screenshot of a suspicious message or website, extract the text, and send it to Botpress for scam risk analysis."
  },
  chatbot: {
    heading: "AI Chatbot",
    description:
      "Ask SparkleBot about suspicious messages, scam warning signs, and safer next steps."
  },
  about: {
    heading: "About AI",
    description:
      "SparkleBot combines practical web tools with modern AI concepts for scam education and safer decision-making."
  }
};

const chatbotQuestions = [
  "Is this message asking for my bank details a scam?",
  "What should I do if I clicked a suspicious link?",
  "How do I recognize a job scam?",
  "Can you explain phishing in simple terms?"
];

exports.getPage = (key) => pages[key];
exports.getChatbotQuestions = () => chatbotQuestions;

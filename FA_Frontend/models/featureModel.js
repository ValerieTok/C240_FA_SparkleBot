const features = [
  {
    title: "Message Checker",
    description: "Paste a suspicious message and receive a scam risk analysis with warning signs and safer next steps.",
    link: "/checker",
    buttonText: "Check a Message"
  },
  {
    title: "Screenshot Review",
    description: "Upload a suspicious screenshot, extract its text, and receive a scam risk analysis.",
    link: "/upload",
    buttonText: "Upload Screenshot"
  },
  {
    title: "AI Scam Guidance",
    description: "Chat with a Botpress assistant connected to scam safety knowledge.",
    link: "/chatbot",
    buttonText: "Ask SparkleBot"
  }
];

exports.getFeatures = () => features;

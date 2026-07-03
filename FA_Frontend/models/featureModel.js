const features = [
  {
    title: "Scam Detector",
    description: "Check suspicious text, URLs, or screenshots with AI-generated risk signals and safer next steps.",
    link: "/checker",
    buttonText: "Check Content"
  },
  {
    title: "AI Scam Guidance",
    description: "Chat with a Botpress assistant connected to scam safety knowledge.",
    link: "/chatbot",
    buttonText: "Ask SparkleBot"
  },
  {
    title: "Report Scam",
    description: "Send suspicious activity details to the admin review workflow.",
    link: "/report-scam",
    buttonText: "Submit Report"
  },
  {
    title: "Feedback",
    description: "Tell us whether SparkleBot was helpful and what can be improved.",
    link: "/feedback",
    buttonText: "Send Feedback"
  }
];

exports.getFeatures = () => features;

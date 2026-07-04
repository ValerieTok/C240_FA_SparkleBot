const features = [
  {
    title: "Scam Detector",
    description: "Analyze suspicious text, URLs, or screenshots and receive a risk level, scam score, red flags, and recommended action.",
    link: "/checker",
    buttonText: "Check Content"
  },
  {
    title: "AI Scam Guidance",
    description: "Open SparkleBot for follow-up guidance on scam warnings, prevention steps, and what to do after a suspicious message.",
    link: "/chatbot",
    buttonText: "Ask SparkleBot"
  },
  {
    title: "Report Scam",
    description: "Submit suspicious activity details so they can be recorded and reviewed through the connected workflow.",
    link: "/report-scam",
    buttonText: "Submit Report"
  },
  {
    title: "Scam Trends",
    description: "View summarized scam pattern insights from recorded reports and analysis data.",
    link: "/scam-trends",
    buttonText: "View Trends"
  },
  {
    title: "Feedback",
    description: "Share whether the detector and chatbot were useful, and suggest improvements for the system.",
    link: "/feedback",
    buttonText: "Send Feedback"
  },
  {
    title: "About AI",
    description: "Learn what AI tools power SparkleBot and how the app uses automation to support scam awareness.",
    link: "/about-ai",
    buttonText: "Learn More"
  }
];

exports.getFeatures = () => features;

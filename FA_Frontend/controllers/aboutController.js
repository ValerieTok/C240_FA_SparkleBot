const pageModel = require("../models/pageModel");

const websiteFunctions = [
  {
    name: "Scam Detector",
    description:
      "Checks suspicious text, URLs, and uploaded screenshots, then returns scam risk signals, red flags, and recommended next steps.",
    link: "/checker",
    linkText: "Open Scam Detector"
  },
  {
    name: "SparkleBot Guidance",
    description:
      "Provides follow-up scam guidance so users can understand warning signs, verify suspicious messages, and decide what to do next.",
    link: "/chatbot",
    linkText: "Ask SparkleBot"
  },
  {
    name: "AI Digital Twin",
    description:
      "Lets users practice scam-response decisions through an interactive scenario before facing similar situations in real life.",
    link: "/digital-twin",
    linkText: "Try AI Digital Twin"
  },
  {
    name: "Scam Report",
    description:
      "Collects suspicious activity details so reports can be recorded and reviewed through the connected workflow.",
    link: "/report-scam",
    linkText: "Submit Report"
  },
  {
    name: "Scam Trends",
    description:
      "Turns recorded reports into summarized dashboard insights so common scam patterns are easier to review.",
    link: "/admin/scam-trends",
    linkText: "View Trends"
  },
  {
    name: "Feedback",
    description:
      "Gathers user feedback on the detector and guidance experience, then displays satisfaction trends and comments in the dashboard.",
    link: "/feedback",
    linkText: "Send Feedback"
  }
];

const aiWorkflow = [
  {
    name: "Content Analysis",
    description:
      "The detector reviews submitted content for suspicious language, risky links, pressure tactics, impersonation signs, and other scam indicators."
  },
  {
    name: "Image Text Extraction",
    description:
      "Uploaded screenshots are processed so readable text can be analyzed alongside pasted messages and URLs."
  },
  {
    name: "Guided Learning",
    description:
      "SparkleBot turns scam results into practical learning prompts and safer actions users can take before replying, clicking, or sharing information."
  },
  {
    name: "Report Summaries",
    description:
      "Submitted reports and feedback are organized into dashboards that help show scam trends, user satisfaction, and recurring concerns."
  }
];

exports.showAbout = (req, res) => {
  res.render("layout", {
    title: "About AI",
    currentPage: "about",
    page: pageModel.getPage("about"),
    websiteFunctions,
    aiWorkflow,
    body: "pages/about"
  });
};

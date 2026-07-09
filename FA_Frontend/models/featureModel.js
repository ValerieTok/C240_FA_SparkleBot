const featureGroups = [
  {
    title: "Scam Checking & SparkleBot Guidance",
    description: "Check suspicious text, URLs, or screenshots for scam signals, then use SparkleBot for follow-up guidance and prevention steps.",
    links: [
      {
        label: "Scam Detector",
        href: "/checker"
      },
      {
        label: "SparkleBot",
        href: "/chatbot"
      }
    ]
  },
  {
    title: "Reports & Scam Trends",
    description: "Submit suspicious activity details and review summarized scam pattern insights from recorded reports and analysis data.",
    links: [
      {
        label: "Scam Report",
        href: "/report-scam"
      },
      {
        label: "Scam Trends",
        href: "/admin/scam-trends"
      }
    ]
  },
  {
    title: "Feedback & Feedback Dashboard",
    description: "Share whether the tools were useful, suggest improvements, and view collected feedback summaries.",
    links: [
      {
        label: "Feedback",
        href: "/feedback"
      },
      {
        label: "Feedback Dashboard",
        href: "/feedback-dashboard"
      }
    ]
  },
  {
    title: "AI Digital Twin",
    description: "Practice scam-response decisions through an interactive digital twin scenario.",
    links: [
      {
        label: "AI Digital Twin",
        href: "/digital-twin"
      }
    ]
  }
];

exports.getFeatures = () => featureGroups;

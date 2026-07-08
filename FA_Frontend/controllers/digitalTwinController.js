exports.showPage = (req, res) => {
  res.render("layout", {
    title: "AI Digital Twin Scam Simulator",
    currentPage: "digital-twin",
    personaWebhookUrl:
      String(process.env.VITE_N8N_WEBHOOK_URL || "").trim() ||
      "https://n8ngc.codeblazar.org/webhook-test/scam-persona-questionnaire",
    choiceWebhookUrl:
      String(process.env.VITE_N8N_CHOICE_WEBHOOK_URL || "").trim() ||
      "https://n8ngc.codeblazar.org/webhook-test/scam-persona-choice",
    body: "pages/digitalTwin"
  });
};

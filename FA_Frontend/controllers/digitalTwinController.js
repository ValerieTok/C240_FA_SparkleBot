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
    emailWebhookUrl: String(
      process.env.VITE_N8N_EMAIL_WEBHOOK_URL ||
        process.env.NEXT_PUBLIC_N8N_EMAIL_WEBHOOK_URL ||
        ""
    ).trim(),
    telegramWebhookUrl: String(process.env.NEXT_PUBLIC_N8N_TELEGRAM_WEBHOOK_URL || "").trim(),
    telegramBotUsername: String(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").trim(),
    body: "pages/digitalTwin"
  });
};

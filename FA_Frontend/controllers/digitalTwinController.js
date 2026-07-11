const toProductionWebhookUrl = (value, fallback) =>
  String(value || fallback || "")
    .trim()
    .replace("/webhook-test/", "/webhook/");

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
    emailWebhookUrl: toProductionWebhookUrl(
      process.env.VITE_N8N_EMAIL_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_EMAIL_WEBHOOK_URL,
      "https://n8ngc.codeblazar.org/webhook/send-results-email"
    ),
    telegramWebhookUrl: toProductionWebhookUrl(
      process.env.NEXT_PUBLIC_N8N_TELEGRAM_WEBHOOK_URL,
      "https://n8ngc.codeblazar.org/webhook/send-results-telegram"
    ),
    telegramBotUsername: String(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").trim(),
    body: "pages/digitalTwin"
  });
};

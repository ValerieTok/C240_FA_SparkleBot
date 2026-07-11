const pageModel = require("../models/pageModel");
const n8nService = require("../services/n8nService");

function renderQuizPage(res, options = {}) {
  res.render("layout", {
    title: "Personalised Scam Awareness Quiz",
    currentPage: "scam-quiz",
    page: pageModel.getPage("quiz"),
    quizError: options.quizError || null,
    quizState: options.quizState || {
      email: "",
      questions: []
    },
    body: "pages/scam-quiz"
  });
}

function normalizeEmail(value) {
  return String(value || "").trim();
}

function normalizeAnswers(answers) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .map((answer) => ({
      question_id: String(answer.question_id || answer.questionId || answer.id || "").trim(),
      selected_option: String(answer.selected_option || answer.selectedOption || answer.option || "").trim().toUpperCase()
    }))
    .filter((answer) => answer.question_id && answer.selected_option);
}

exports.showQuiz = (req, res) => {
  renderQuizPage(res);
};

exports.startQuiz = async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    const quiz = await n8nService.requestScamQuiz({
      action: "start_quiz",
      email
    });
    const sessionId = String(quiz.sessionId || quiz.session_id || "").trim();

    console.log("Scam quiz start returned session_id:", sessionId || "(empty)");

    res.json({
      success: true,
      email,
      session_id: sessionId,
      sessionId,
      quiz
    });
  } catch (error) {
    console.error("Scam quiz start failed:", error.message);

    res.status(500).json({
      success: false,
      message: n8nService.getFriendlyQuizError(error)
    });
  }
};

exports.submitQuiz = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const mode = String(req.body.mode || "general").trim() || "general";
  const sessionId = String(req.body.session_id || req.body.sessionId || "").trim();
  const answers = normalizeAnswers(req.body.answers);

  console.log("Scam quiz submit incoming session_id:", sessionId || "(empty)");
  console.log("Scam quiz submit incoming mode:", mode);

  try {
    const payload = {
      action: "submit_quiz",
      email,
      mode,
      session_id: sessionId,
      answers
    };

    const result = await n8nService.requestScamQuiz(payload);

    res.json({
      success: true,
      email,
      result
    });
  } catch (error) {
    console.error("Scam quiz submit failed:", error.message);

    res.status(500).json({
      success: false,
      message: n8nService.getFriendlyQuizError(error)
    });
  }
};
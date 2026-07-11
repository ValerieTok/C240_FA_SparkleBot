const fs = require("fs/promises");

function postWebhook(webhookUrl, payload, workflowName, envName) {
  const trimmedUrl = String(webhookUrl || "").trim();

  if (!trimmedUrl) {
    console.warn(`n8n ${workflowName} webhook skipped: ${envName} is not configured.`);
    return;
  }

  fetch(trimmedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(getWebhookErrorMessage(response.status, trimmedUrl));
      }
    })
    .catch((error) => {
      console.error(`n8n ${workflowName} webhook failed:`, error.message || error);
    });
}

async function requestWebhook(webhookUrl, payload, workflowName, envName) {
  const trimmedUrl = String(webhookUrl || "").trim();

  if (!trimmedUrl) {
    throw new Error(`${envName} missing.`);
  }

  const response = await fetch(trimmedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    if (responseText) {
      console.error(`n8n ${workflowName} error response:`, responseText);
    }

    throw new Error(getWebhookErrorMessage(response.status, trimmedUrl));
  }

  return parseJsonMaybe(responseText) || {
    success: true,
    message: `${workflowName} submitted successfully.`
  };
}

async function requestScamAnalysis({
  checkType,
  contentType,
  content,
  message,
  url,
  notes,
  extractedText,
  uploadedImage,
  imageFile
}) {
  const webhookUrl =
    process.env.N8N_SCAM_ANALYSIS_WEBHOOK_URL ||
    process.env.N8N_SCAM_DETECTOR_WEBHOOK_URL ||
    process.env.N8N_CHECKER_WEBHOOK_URL;
  const trimmedUrl = String(webhookUrl || "").trim();

  if (!trimmedUrl) {
    throw new Error("N8N_SCAM_ANALYSIS_WEBHOOK_URL missing.");
  }

  const payload = {
    eventType: "scam_analysis",
    submittedAt: new Date().toISOString(),
    source: "Scam Detector",
    checkType: checkType || contentType,
    contentType,
    content: content || "",
    message: message || "",
    url: url || "",
    notes: notes || "",
    extractedText: extractedText || "",
    uploadedImage: uploadedImage || ""
  };

  const response = imageFile
    ? await postImageAnalysisRequest(trimmedUrl, payload, imageFile)
    : await fetch(trimmedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

  const responseText = await response.text();

  if (!response.ok) {
    if (responseText) {
      console.error("n8n scam analysis error response:", responseText);
    }

    throw new Error(getWebhookErrorMessage(response.status, trimmedUrl));
  }

  return normalizeAnalysis(parseAnalysisResponse(responseText));
}

async function postImageAnalysisRequest(webhookUrl, payload, imageFile) {
  const formData = new FormData();
  const fileBuffer = await fs.readFile(imageFile.path);
  const imageBlob = new Blob([fileBuffer], {
    type: imageFile.mimetype || "application/octet-stream"
  });

  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, String(value || ""));
  });

  formData.append("screenshot", imageBlob, imageFile.originalname || imageFile.filename || "screenshot");

  return fetch(webhookUrl, {
    method: "POST",
    body: formData
  });
}

function sendHighRiskAlert(analysis, userMessage) {
  if (!isHighRiskAnalysis(analysis)) {
    return;
  }

  postWebhook(
    process.env.N8N_HIGH_RISK_WEBHOOK_URL,
    {
      eventType: "high_risk_alert",
      submittedAt: new Date().toISOString(),
      source: "Scam Detector",
      riskLevel: analysis.riskLevel,
      scamType: analysis.scamType,
      redFlags: analysis.redFlags,
      recommendedAction: analysis.recommendedAction,
      message: userMessage
    },
    "high-risk alert",
    "N8N_HIGH_RISK_WEBHOOK_URL"
  );
}

function submitScamReport(report) {
  return requestWebhook(
    process.env.N8N_SCAM_REPORT_WEBHOOK_URL,
    {
      eventType: "scam_report",
      submittedAt: new Date().toISOString(),
      source: "Website Report Scam Form",
      ...report
    },
    "scam report",
    "N8N_SCAM_REPORT_WEBHOOK_URL"
  );
}

function sendFeedback(feedback) {
  postWebhook(
    process.env.N8N_FEEDBACK_WEBHOOK_URL,
    {
      eventType: "feedback",
      submittedAt: new Date().toISOString(),
      source: "Website Feedback Form",
      ...feedback
    },
    "feedback",
    "N8N_FEEDBACK_WEBHOOK_URL"
  );
}

function sendRecommendedLearningContext(context) {
  postWebhook(
    process.env.N8N_RECOMMENDED_LEARNING_WEBHOOK_URL || process.env.N8N_SCAM_LEARNING_WEBHOOK_URL,
    {
      eventType: "recommended_learning_context",
      submittedAt: new Date().toISOString(),
      source: "SparkleBot Frontend",
      ...context
    },
    "recommended learning context",
    "N8N_RECOMMENDED_LEARNING_WEBHOOK_URL"
  );
}

async function requestScamQuiz(payload) {
  const trimmedUrl = String(process.env.N8N_SCAM_QUIZ_WEBHOOK_URL || "").trim();

  if (!trimmedUrl) {
    throw new Error("N8N_SCAM_QUIZ_WEBHOOK_URL missing.");
  }

  console.log("Scam quiz payload sent to n8n:", JSON.stringify(payload));

  const response = await fetch(trimmedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  console.log("Raw scam quiz n8n response:", responseText);

  if (!response.ok) {
    if (responseText) {
      console.error("n8n scam quiz error response:", responseText);
    }

    throw new Error(getWebhookErrorMessage(response.status, trimmedUrl));
  }

  return normalizeQuizResponse(parseQuizResponse(responseText));
}

function parseAnalysisResponse(responseText) {
  const trimmedText = String(responseText || "").trim();

  if (!trimmedText) {
    throw new Error("n8n scam analysis returned an empty response.");
  }

  const parsed = parseJsonMaybe(trimmedText);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;

  if (typeof result === "string") {
    return parseJsonMaybe(result);
  }

  if (!result || typeof result !== "object") {
    throw new Error("n8n scam analysis returned an unsupported response.");
  }

  const nestedAnalysis = findAnalysisObject(result);

  if (nestedAnalysis) {
    return nestedAnalysis;
  }

  const modelText =
    result.output ||
    result.text ||
    result.response ||
    result.responseText ||
    result.response_text ||
    result["Response Text"] ||
    result.message ||
    result.result ||
    result.data?.output ||
    result.data?.text ||
    result.data?.response ||
    result.data?.responseText ||
    result.data?.response_text ||
    result.data?.["Response Text"];

  if (typeof modelText === "string") {
    const parsedModelText = parseJsonMaybe(stripCodeFence(modelText));
    const nestedModelAnalysis = findAnalysisObject(parsedModelText);

    return nestedModelAnalysis || parsedModelText;
  }

  if (modelText && typeof modelText === "object") {
    const nestedModelAnalysis = findAnalysisObject(modelText);

    return nestedModelAnalysis || modelText;
  }

  return result;
}

function findAnalysisObject(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (hasAnalysisFields(value)) {
    return value;
  }

  const candidates = [
    value.analysis,
    value.body,
    value.json,
    value.output,
    value.response,
    value.result,
    value.data,
    value.message,
    value.message?.content,
    value.choices?.[0]?.message?.content
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const parsed = parseJsonMaybe(stripCodeFence(candidate));

      if (parsed && typeof parsed === "object") {
        const nested = findAnalysisObject(parsed);

        if (nested) {
          return nested;
        }
      }
    }

    if (candidate && typeof candidate === "object") {
      const nested = findAnalysisObject(candidate);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function hasAnalysisFields(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value.riskLevel || value.risk_level || value.risk || value.score || value.aiRiskScore || value.ai_risk_score) &&
      (
        value.scamType ||
        value.scam_type ||
        value.type ||
        value.category ||
        value.learningTopics ||
        value.learning_topics ||
        value.suggestedQuestions ||
        value.suggested_questions ||
        value.redFlags ||
        value.red_flags ||
        value.reasons ||
        value.indicators
      )
  );
}

function parseJsonMaybe(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function parseQuizResponse(responseText) {
  const trimmedText = String(responseText || "").trim();

  if (!trimmedText) {
    throw new Error("n8n scam quiz returned an empty response.");
  }

  const parsed = parseJsonMaybe(trimmedText);
  const result = Array.isArray(parsed) ? parsed[0] : parsed;

  if (typeof result === "string") {
    return parseJsonMaybe(stripCodeFence(result));
  }

  if (!result || typeof result !== "object") {
    throw new Error("n8n scam quiz returned an unsupported response.");
  }

  const nestedQuiz = findQuizPayload(result);

  return nestedQuiz || result;
}

function findQuizPayload(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (hasQuizFields(value)) {
    return value;
  }

  const candidates = [
    value.quiz,
    value.data,
    value.result,
    value.output,
    value.response,
    value.body,
    value.message,
    value.message?.content,
    value.choices?.[0]?.message?.content
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const parsed = parseJsonMaybe(stripCodeFence(candidate));

      if (parsed && typeof parsed === "object") {
        const nested = findQuizPayload(parsed);

        if (nested) {
          return nested;
        }
      }
    }

    if (candidate && typeof candidate === "object") {
      const nested = findQuizPayload(candidate);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function hasQuizFields(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value.questions ||
        value.score !== undefined ||
        value.total !== undefined ||
        value.percentage !== undefined ||
        value.weakCategories ||
        value.strongCategories ||
        value.aiLatestSummary ||
        value.ai_latest_summary ||
        value.summary ||
        value.latest_summary ||
        value.latestSummary ||
        value.mode ||
        value.session_id ||
        value.sessionId)
  );
}

function normalizeQuizResponse(result) {
  const normalizedQuestions = Array.isArray(result.questions)
    ? result.questions.map(normalizeQuizQuestion).filter(Boolean)
    : [];

  return {
    quizId: String(result.quizId || result.quiz_id || result.id || result.sessionId || result.session_id || "").trim(),
    sessionId: String(result.sessionId || result.session_id || result.quizId || result.quiz_id || result.id || "").trim(),
    mode: normalizeQuizMode(result.mode || result.quizMode || result.quiz_mode),
    questions: normalizedQuestions,
    score: normalizeQuizMetric(result.score ?? result.quizScore ?? result.correctAnswers ?? result.correct_answers),
    total: normalizeQuizMetric(result.total ?? result.totalQuestions ?? result.total_questions ?? normalizedQuestions.length),
    percentage: normalizeQuizMetric(
      result.percentage ?? result.percent ?? result.scorePercentage ?? result.score_percentage
    ),
    weakCategories: normalizeQuizStringList(
      result.weakCategories ?? result.weak_categories ?? result.weakAreas ?? result.weak_areas
    ),
    strongCategories: normalizeQuizStringList(
      result.strongCategories ?? result.strong_categories ?? result.strongAreas ?? result.strong_areas
    ),
    aiLatestSummary: String(
      result.aiLatestSummary ??
        result.ai_latest_summary ??
        result.latestSummary ??
        result.latest_summary ??
        result.summary ??
        result.message ??
        result.latestSummaryText ??
        result.latest_summary_text ??
        ""
    ).trim(),
    raw: result
  };
}

function normalizeQuizMode(value) {
  const mode = String(value || "").trim().toLowerCase();

  if (mode === "targeted_ai" || mode === "targeted-ai" || mode === "personalised_ai") {
    return "targeted_ai";
  }

  return "general";
}

function normalizeQuizQuestion(item, index) {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    return {
      question_id: String(index + 1),
      question: item.trim(),
      options: ["A", "B", "C", "D"].map((letter) => ({
        key: letter,
        label: `Option ${letter}`
      }))
    };
  }

  const questionId = String(item.question_id || item.questionId || item.id || index + 1).trim();
  const question = String(
    item.question || item.prompt || item.text || item.question_text || item.questionText || ""
  ).trim();

  return {
    question_id: questionId,
    question: question || `Question ${index + 1}`,
    options: normalizeQuizOptions(item.options || item.answer_options || item.answers || item.choices || item, index)
  };
}

function normalizeQuizOptions(rawOptions, fallbackItem) {
  const optionKeys = ["A", "B", "C", "D"];

  return optionKeys.map((letter, index) => {
    const value = resolveQuizOptionValue(rawOptions, fallbackItem, letter, index);

    return {
      key: letter,
      label: String(value || `Option ${letter}`).trim()
    };
  });
}

function resolveQuizOptionValue(rawOptions, fallbackItem, letter, index) {
  if (Array.isArray(rawOptions)) {
    return rawOptions[index];
  }

  if (rawOptions && typeof rawOptions === "object") {
    return (
      rawOptions[letter] ??
      rawOptions[letter.toLowerCase()] ??
      rawOptions[`option_${letter.toLowerCase()}`] ??
      rawOptions[`option${letter}`] ??
      rawOptions[index + 1]
    );
  }

  if (fallbackItem && typeof fallbackItem === "object") {
    return (
      fallbackItem[letter] ??
      fallbackItem[letter.toLowerCase()] ??
      fallbackItem[`option_${letter.toLowerCase()}`] ??
      fallbackItem[`option${letter}`]
    );
  }

  return "";
}

function normalizeQuizMetric(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return String(value).trim();
}

function normalizeQuizStringList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).map((entry) => String(entry).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|,\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function stripCodeFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeAnalysis(result) {
  if (!result || typeof result !== "object" || !hasAnalysisFields(result)) {
    throw new Error("n8n scam analysis response is missing required analysis fields.");
  }

  const redFlags =
    result.redFlags ||
    result.red_flags ||
    result.flags ||
    result.reasons ||
    result.indicators ||
    [];
  const riskLevel = normalizeRiskLevel(result.riskLevel || result.risk_level || result.risk);
  const rawScore =
    result.score ??
    result.finalScore ??
    result.final_score ??
    result.riskScore ??
    result.risk_score ??
    result.finalRiskScore ??
    result.final_risk_score ??
    result.aiRiskScore ??
    result.ai_risk_score;
  const score = normalizeScore(rawScore, riskLevel);
  const rawIsScam =
    result.isScam ??
    result.is_scam ??
    result.finalIsScam ??
    result.final_is_scam;
  const isScam = normalizeIsScam(rawIsScam, riskLevel, score);
  const extractedText = normalizeExtractedText(result);

  return {
    riskLevel,
    scamType: normalizeScamType(result),
    redFlags: Array.isArray(redFlags)
      ? redFlags.map(String)
      : String(redFlags || "")
          .split(/\r?\n|,\s*/)
          .map((flag) => flag.trim())
          .filter(Boolean),
    recommendedAction: normalizeRecommendedAction(result),
    extractedText,
    message: String(result.message || result.content || extractedText || ""),
    contentType: String(result.contentType || result.content_type || result.checkType || result.check_type || ""),
    source: String(result.source || ""),
    score,
    isScam
  };
}

function normalizeRecommendedAction(result) {
  const explicitAction =
    result.recommendedAction ||
    result.recommended_action ||
    result.action ||
    result.advice;

  if (explicitAction) {
    return String(explicitAction).trim();
  }

  const scamType = inferScamType(result);

  if (scamType === "Phishing") {
    return "Do not click the link or provide personal information. Verify through the official website or app, then block and report the sender.";
  }

  if (result.isScam === true || normalizeScore(result.score ?? result.aiRiskScore ?? result.ai_risk_score, "") >= 70) {
    return "Do not continue with the request. Verify through an official source and report the suspicious message.";
  }

  return "Review the warning signs and verify through an official source before taking action.";
}

function normalizeScamType(result) {
  const explicitType = result.scamType || result.scam_type || result.type;

  if (explicitType) {
    return String(explicitType).trim();
  }

  const inferredType = inferScamType(result);

  if (inferredType) {
    return inferredType;
  }

  return String(result.category || "Unknown").trim() || "Unknown";
}

function inferScamType(result) {
  const text = [
    result.category,
    result.reason,
    result.reasons,
    result.redFlags,
    result.red_flags,
    result.flags,
    result.indicators,
    result.learningTopics,
    result.learning_topics,
    result.suggestedQuestions,
    result.suggested_questions,
    result.learningReason,
    result.learning_reason,
    result.message,
    result.content
  ]
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === "object") {
        return Object.values(value);
      }

      return [value];
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("phishing") || text.includes("credential") || text.includes("login") || text.includes("suspicious link")) {
    return "Phishing";
  }

  if (text.includes("job") || text.includes("recruiter") || text.includes("hiring")) {
    return "Job scam";
  }

  if (text.includes("payment") || text.includes("invoice") || text.includes("refund") || text.includes("transfer")) {
    return "Payment scam";
  }

  if (text.includes("impersonation") || text.includes("impersonates") || text.includes("official service")) {
    return "Impersonation scam";
  }

  if (text.includes("investment") || text.includes("guaranteed return") || text.includes("crypto")) {
    return "Investment scam";
  }

  return "";
}

function normalizeExtractedText(result) {
  const value =
    result.extractedText ??
    result.extracted_text ??
    result.ocrText ??
    result.ocr_text ??
    result.imageText ??
    result.image_text ??
    result.textFromImage ??
    result.text_from_image ??
    result.extracted ??
    result.message ??
    result.content ??
    result.text;

  if (Array.isArray(value)) {
    return value.map(String).join("\n").trim();
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value || "").trim();
}

function normalizeRiskLevel(value) {
  const riskLevel = String(value || "").trim().toLowerCase();

  if (riskLevel.includes("high")) {
    return "High";
  }

  if (riskLevel.includes("medium") || riskLevel.includes("moderate")) {
    return "Medium";
  }

  if (riskLevel.includes("low")) {
    return "Low";
  }

  return String(value || "Unknown").trim() || "Unknown";
}

function normalizeScore(value, riskLevel) {
  const score = Number(value);

  if (Number.isFinite(score)) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  if (riskLevel === "High") {
    return 85;
  }

  if (riskLevel === "Medium") {
    return 55;
  }

  if (riskLevel === "Low") {
    return 20;
  }

  return null;
}

function normalizeIsScam(value, riskLevel, score) {
  if (typeof value === "boolean") {
    return value || riskLevel === "High" || score >= 70;
  }

  const text = String(value || "").trim().toLowerCase();

  if (["true", "yes", "scam", "likely"].includes(text)) {
    return true;
  }

  if (["false", "no", "not scam", "unlikely"].includes(text)) {
    return riskLevel === "High" || score >= 70;
  }

  return riskLevel === "High" || score >= 70;
}

function getWebhookErrorMessage(status, webhookUrl) {
  if (status === 404 && webhookUrl.includes("/webhook-test/")) {
    return [
      "n8n webhook returned HTTP 404.",
      "The test webhook only works while n8n is listening for a test event.",
      "Click 'Listen for test event' in n8n before submitting the website form, or use the production /webhook/ URL with an active workflow."
    ].join(" ");
  }

  return `n8n webhook returned HTTP ${status}`;
}

function getFriendlyN8nError(error) {
  const message = error.message || "";

  if (
    message.includes("N8N_SCAM_ANALYSIS_WEBHOOK_URL") ||
    message.includes("N8N_SCAM_DETECTOR_WEBHOOK_URL") ||
    message.includes("N8N_CHECKER_WEBHOOK_URL")
  ) {
    return "n8n scam analysis webhook is missing. Add N8N_SCAM_ANALYSIS_WEBHOOK_URL to your .env file.";
  }

  if (message.includes("webhook-test") || message.includes("HTTP 404")) {
    return "n8n scam analysis webhook is not listening. In n8n, click 'Listen for test event' for the test URL, or use the production webhook URL with an active workflow.";
  }

  if (
    message.includes("empty response") ||
    message.includes("unsupported response") ||
    message.includes("missing required analysis fields")
  ) {
    return "n8n did not return a usable scam analysis. Configure the workflow response to return riskLevel, scamType, redFlags, and recommendedAction.";
  }

  return "n8n scam analysis is unavailable right now. Please check the workflow and try again.";
}

function getFriendlyReportError(error) {
  const message = error.message || "";

  if (message.includes("N8N_SCAM_REPORT_WEBHOOK_URL")) {
    return "n8n scam report webhook is missing. Add N8N_SCAM_REPORT_WEBHOOK_URL to your .env file.";
  }

  if (message.includes("webhook-test") || message.includes("HTTP 404")) {
    return "n8n scam report webhook is not listening. Use the production webhook URL with an active workflow, or click 'Listen for test event' in n8n.";
  }

  return "n8n scam report workflow is unavailable right now. Please check the workflow and try again.";
}

function getFriendlyQuizError(error) {
  const message = error.message || "";

  if (message.includes("N8N_SCAM_QUIZ_WEBHOOK_URL")) {
    return "n8n scam quiz webhook is missing. Add N8N_SCAM_QUIZ_WEBHOOK_URL to your .env file.";
  }

  if (message.includes("webhook-test") || message.includes("HTTP 404")) {
    return "n8n scam quiz webhook is not listening. Use the production webhook URL with an active workflow, or click 'Listen for test event' in n8n.";
  }

  if (message.includes("empty response") || message.includes("unsupported response")) {
    return "n8n did not return a usable quiz response. Configure the workflow to return questions for start_quiz and score details for submit_quiz.";
  }

  return "n8n scam quiz is unavailable right now. Please check the workflow and try again.";
}

function isHighRiskAnalysis(analysis) {
  const riskLevel = getAnalysisValue(analysis, "riskLevel").toLowerCase();

  if (riskLevel === "high") {
    return true;
  }

  const riskText = stringifyAnalysis(analysis).toLowerCase();

  return (
    riskText.includes("scam risk: high") ||
    riskText.includes("risk level: high") ||
    riskText.includes("high risk")
  );
}

function getAnalysisValue(analysis, key) {
  if (!analysis || typeof analysis !== "object") {
    return "";
  }

  return String(analysis[key] || "").trim();
}

function stringifyAnalysis(analysis) {
  if (typeof analysis === "string") {
    return analysis;
  }

  if (!analysis || typeof analysis !== "object") {
    return "";
  }

  return [
    analysis.riskLevel,
    analysis.scamType,
    Array.isArray(analysis.redFlags) ? analysis.redFlags.join(" ") : analysis.redFlags,
    analysis.recommendedAction
  ]
    .filter(Boolean)
    .join(" ");
}

module.exports = {
  requestScamAnalysis,
  getFriendlyN8nError,
  getFriendlyReportError,
  requestScamQuiz,
  getFriendlyQuizError,
  sendHighRiskAlert,
  submitScamReport,
  sendFeedback,
  sendRecommendedLearningContext
};

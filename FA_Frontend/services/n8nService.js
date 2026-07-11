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

  const parsed = parseJsonMaybe(stripCodeFence(trimmedText));
  const result = Array.isArray(parsed) ? parsed[0] : parsed;

  if (typeof result === "string") {
    return parseJsonMaybe(stripCodeFence(result));
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
      (
        hasUsefulAnalysisValue(getAnalysisField(value, RISK_LEVEL_FIELDS)) ||
        hasUsefulAnalysisValue(getAnalysisField(value, SCORE_FIELDS)) ||
        hasUsefulAnalysisValue(getAnalysisField(value, IS_SCAM_FIELDS))
      ) &&
      (
        hasUsefulAnalysisValue(getAnalysisField(value, SCAM_TYPE_FIELDS)) ||
        hasUsefulAnalysisValue(getAnalysisField(value, RED_FLAG_FIELDS)) ||
        hasUsefulAnalysisValue(getAnalysisField(value, CONTEXT_FIELDS))
      )
  );
}

function parseJsonMaybe(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    const jsonText = extractJsonText(value);

    if (jsonText && jsonText !== value) {
      try {
        return JSON.parse(jsonText);
      } catch (nestedError) {
        return parseTextAnalysis(value);
      }
    }

    return parseTextAnalysis(value);
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

function extractJsonText(value) {
  const text = String(value || "").trim();
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }

  return "";
}

function parseTextAnalysis(value) {
  const text = String(value || "").trim();

  if (!text) {
    return text;
  }

  const riskLevel = matchLabeledValue(text, /risk\s*level|risk/i);
  const scamType = matchLabeledValue(text, /(?:possible\s+)?scam\s*type|type|category/i);
  const score = matchLabeledValue(text, /(?:scam\s*)?score|risk\s*score|final\s*score/i);
  const isScam = matchLabeledValue(text, /(?:is\s*)?scam\s*detected|is\s*scam|final\s*is\s*scam/i);
  const redFlagsText = matchLabeledBlock(text, /red\s*flags?|reasons?|indicators?/i, /recommended\s*action|advice|next\s*steps?/i);
  const recommendedAction = matchLabeledValue(text, /recommended\s*action|advice|next\s*steps?/i);

  const parsed = {
    riskLevel,
    scamType,
    score,
    isScam,
    redFlags: splitListText(redFlagsText),
    recommendedAction,
    reason: text
  };

  return hasAnalysisFields(parsed) ? parsed : text;
}

function matchLabeledValue(text, labelPattern) {
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:${labelPattern.source})\\s*[:=-]\\s*([^\\n]+)`, "i"));

  return match ? match[1].trim() : "";
}

function matchLabeledBlock(text, labelPattern, stopPattern) {
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:${labelPattern.source})\\s*[:=-]\\s*([\\s\\S]*?)(?=\\n\\s*(?:[-*]\\s*)?(?:${stopPattern.source})\\s*[:=-]|$)`, "i"));

  return match ? match[1].trim() : "";
}

const RISK_LEVEL_FIELDS = ["riskLevel", "risk_level", "risk", "Risk Level", "Scam Risk", "scamRisk"];
const SCORE_FIELDS = [
  "score",
  "finalScore",
  "final_score",
  "riskScore",
  "risk_score",
  "finalRiskScore",
  "final_risk_score",
  "aiRiskScore",
  "ai_risk_score",
  "Scam Score",
  "Risk Score",
  "Final Score"
];
const IS_SCAM_FIELDS = ["isScam", "is_scam", "finalIsScam", "final_is_scam", "Scam Detected", "scamDetected"];
const SCAM_TYPE_FIELDS = ["scamType", "scam_type", "type", "category", "Possible Scam Type", "Scam Type"];
const RED_FLAG_FIELDS = ["redFlags", "red_flags", "flags", "reasons", "indicators", "Red Flags", "warningSigns"];
const ACTION_FIELDS = ["recommendedAction", "recommended_action", "action", "advice", "Recommended Action", "Next Steps"];
const CONTEXT_FIELDS = [
  "reason",
  "justification",
  "explanation",
  "summary",
  "learningTopics",
  "learning_topics",
  "suggestedQuestions",
  "suggested_questions"
];

function getAnalysisField(source, aliases) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const alias of aliases) {
    if (source[alias] !== undefined) {
      return source[alias];
    }
  }

  const normalizedAliases = new Set(aliases.map(normalizeFieldName));
  const matchingKey = Object.keys(source).find((key) => normalizedAliases.has(normalizeFieldName(key)));

  return matchingKey ? source[matchingKey] : undefined;
}

function normalizeFieldName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasUsefulAnalysisValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeAnalysis(result) {
  if (!result || (typeof result !== "object" && typeof result !== "string")) {
    throw new Error("n8n scam analysis response is missing required analysis fields.");
  }

  if (typeof result === "string") {
    return normalizeFallbackAnalysis(result);
  }

  if (!hasAnalysisFields(result)) {
    console.warn("n8n scam analysis response did not match known fields; using fallback analysis:", previewValue(result));
    return normalizeFallbackAnalysis(result);
  }

  const redFlags =
    getAnalysisField(result, RED_FLAG_FIELDS) ||
    getAnalysisField(result, CONTEXT_FIELDS) ||
    [];
  const rawScore =
    getAnalysisField(result, SCORE_FIELDS);
  const riskLevel = normalizeRiskLevel(getAnalysisField(result, RISK_LEVEL_FIELDS), rawScore);
  const score = normalizeScore(rawScore, riskLevel);
  const rawIsScam = getAnalysisField(result, IS_SCAM_FIELDS);
  const isScam = normalizeIsScam(rawIsScam, riskLevel, score);
  const extractedText = normalizeExtractedText(result);

  return {
    riskLevel,
    scamType: normalizeScamType(result),
    redFlags: normalizeRedFlags(redFlags),
    recommendedAction: normalizeRecommendedAction(result),
    extractedText,
    message: String(result.message || result.content || extractedText || ""),
    contentType: String(result.contentType || result.content_type || result.checkType || result.check_type || ""),
    source: String(result.source || ""),
    score,
    isScam
  };
}

function normalizeFallbackAnalysis(result) {
  const text = stringifyFallbackAnalysis(result);
  const parsedText = parseTextAnalysis(text);
  const parsed = parsedText && typeof parsedText === "object" ? parsedText : { reason: text };
  const rawScore = getAnalysisField(parsed, SCORE_FIELDS);
  const riskLevel = normalizeRiskLevel(getAnalysisField(parsed, RISK_LEVEL_FIELDS) || inferRiskLevelFromText(text), rawScore);
  const score = normalizeScore(rawScore, riskLevel);
  const parsedRedFlags = getAnalysisField(parsed, RED_FLAG_FIELDS);
  const redFlags = normalizeRedFlags(
    hasUsefulAnalysisValue(parsedRedFlags) ? parsedRedFlags : getAnalysisField(parsed, CONTEXT_FIELDS) || text
  );

  return {
    riskLevel,
    scamType: normalizeScamType(parsed),
    redFlags,
    recommendedAction: normalizeRecommendedAction(parsed),
    extractedText: "",
    message: text,
    contentType: "",
    source: "",
    score,
    isScam: normalizeIsScam(getAnalysisField(parsed, IS_SCAM_FIELDS), riskLevel, score)
  };
}

function stringifyFallbackAnalysis(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return Object.entries(value)
    .map(([key, fieldValue]) => `${key}: ${formatFallbackValue(fieldValue)}`)
    .filter((line) => line.trim())
    .join("\n")
    .trim();
}

function formatFallbackValue(value) {
  if (Array.isArray(value)) {
    return value.map(formatFallbackValue).filter(Boolean).join(", ");
  }

  if (value && typeof value === "object") {
    return stringifyFallbackAnalysis(value);
  }

  return String(value || "").trim();
}

function previewValue(value) {
  return stringifyFallbackAnalysis(value).slice(0, 1000);
}

function normalizeRedFlags(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((flag) => flag.trim()).filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(normalizeRedFlags);
  }

  return splitListText(value);
}

function splitListText(value) {
  return String(value || "")
    .split(/\r?\n|,\s*|;\s*/)
    .map((flag) => flag.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function normalizeRecommendedAction(result) {
  const explicitAction =
    getAnalysisField(result, ACTION_FIELDS);

  if (explicitAction) {
    return String(explicitAction).trim();
  }

  const scamType = inferScamType(result);

  if (scamType === "Phishing") {
    return "Do not click the link or provide personal information. Verify through the official website or app, then block and report the sender.";
  }

  if (
    getAnalysisField(result, IS_SCAM_FIELDS) === true ||
    normalizeScore(getAnalysisField(result, SCORE_FIELDS), "") >= 70
  ) {
    return "Do not continue with the request. Verify through an official source and report the suspicious message.";
  }

  return "Review the warning signs and verify through an official source before taking action.";
}

function normalizeScamType(result) {
  const explicitType = getAnalysisField(result, SCAM_TYPE_FIELDS);

  if (explicitType) {
    return String(explicitType).trim();
  }

  const inferredType = inferScamType(result);

  if (inferredType) {
    return inferredType;
  }

  return String(getAnalysisField(result, ["category"]) || "Unknown").trim() || "Unknown";
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

function inferRiskLevelFromText(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("high risk") || text.includes("risk level: high") || text.includes("risk: high")) {
    return "High";
  }

  if (
    text.includes("medium risk") ||
    text.includes("moderate risk") ||
    text.includes("risk level: medium") ||
    text.includes("risk: medium") ||
    text.includes("risk level: moderate") ||
    text.includes("risk: moderate")
  ) {
    return "Medium";
  }

  if (text.includes("low risk") || text.includes("risk level: low") || text.includes("risk: low")) {
    return "Low";
  }

  if (text.includes("scam") || text.includes("phishing") || text.includes("suspicious")) {
    return "High";
  }

  return "Unknown";
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

function normalizeRiskLevel(value, scoreValue) {
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

  const score = parseNumericScore(scoreValue);

  if (Number.isFinite(score)) {
    if (score >= 70) {
      return "High";
    }

    if (score >= 40) {
      return "Medium";
    }

    return "Low";
  }

  return String(value || "Unknown").trim() || "Unknown";
}

function normalizeScore(value, riskLevel) {
  const score = parseNumericScore(value);

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

function parseNumericScore(value) {
  if (typeof value === "number") {
    return value;
  }

  const text = String(value || "").trim();
  const percentageMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);

  if (percentageMatch) {
    return Number(percentageMatch[1]);
  }

  const ratioMatch = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);

  if (ratioMatch) {
    const numerator = Number(ratioMatch[1]);
    const denominator = Number(ratioMatch[2]);

    return denominator ? (numerator / denominator) * 100 : NaN;
  }

  const numberMatch = text.match(/\d+(?:\.\d+)?/);

  return numberMatch ? Number(numberMatch[0]) : NaN;
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

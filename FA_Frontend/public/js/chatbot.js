(function () {
  const webchat = document.getElementById("sparklebot-webchat");

  if (!webchat) {
    return;
  }

  const scamContext = getScamContext();
  let scamContextSent = false;
  let learningContextSubmitted = false;
  let lastBotpressOpen = false;

  function getScamContext() {
    const context = {
      riskLevel: webchat.dataset.riskLevel || "",
      score: webchat.dataset.score || "",
      scamType: webchat.dataset.scamType || "",
      redFlags: webchat.dataset.redFlags || "",
      recommendedAction: webchat.dataset.recommendedAction || "",
      learningPrompts: parseLearningPrompts(webchat.dataset.learningPrompts)
    };

    if (!context.riskLevel && !context.score && !context.scamType && !context.redFlags && !context.recommendedAction) {
      return null;
    }

    return context;
  }

  function parseLearningPrompts(value) {
    try {
      const prompts = JSON.parse(value || "[]");

      return Array.isArray(prompts) ? prompts.map(String).filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  function buildLearningPayload() {
    const detectedScamType = scamContext.scamType || "unknown";

    return {
      ...scamContext,
      scamType: detectedScamType,
      detectedScamType,
      scam_type: detectedScamType,
      learningScamType: detectedScamType,
      recommendedLearning: scamContext.learningPrompts,
      learningPrompts: scamContext.learningPrompts,
      source: "SparkleBot Scam Detector"
    };
  }

  async function updateBotpressUserData() {
    if (!scamContext || !window.botpress || typeof window.botpress.updateUser !== "function") {
      return;
    }

    const payload = buildLearningPayload();

    try {
      await window.botpress.updateUser({
        data: {
          scamContext: payload,
          scamType: payload.scamType,
          detectedScamType: payload.detectedScamType,
          scam_type: payload.scam_type,
          learningScamType: payload.learningScamType,
          recommendedLearning: payload.recommendedLearning,
          learningPrompts: payload.learningPrompts,
          riskLevel: payload.riskLevel,
          score: payload.score,
          redFlags: payload.redFlags,
          recommendedAction: payload.recommendedAction
        }
      });
    } catch (error) {
      // Keep the chat usable even if Botpress rejects a user data update.
    }
  }

  function submitLearningContextToN8n() {
    if (!scamContext || learningContextSubmitted) {
      return;
    }

    learningContextSubmitted = true;

    fetch("/chatbot/recommended-learning-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildLearningPayload()),
      keepalive: true
    }).catch(() => {
      learningContextSubmitted = false;
    });
  }

  function sendScamContextToBotpress(force = false) {
    if (!scamContext || (!force && scamContextSent) || !window.botpress) {
      return;
    }

    const payload = buildLearningPayload();

    if (typeof window.botpress.sendEvent === "function") {
      window.botpress.sendEvent({
        type: "custom",
        name: "scam_context",
        payload
      });
      window.botpress.sendEvent({
        type: "custom",
        name: "recommended_learning_context",
        payload
      });
      scamContextSent = true;
      return;
    }

    scamContextSent = true;
  }

  function registerBotpressEvents() {
    if (!window.botpress || typeof window.botpress.on !== "function") {
      return;
    }

    window.botpress.on("webchat:initialized", () => {
      updateBotpressUserData();
    });

    window.botpress.on("webchat:ready", () => {
      updateBotpressUserData();
      sendScamContextToBotpress(true);
    });

    window.botpress.on("webchat:opened", () => {
      updateBotpressUserData();
      sendScamContextToBotpress(true);
    });
  }


  function watchBotpressOpenState() {
    if (!scamContext || !window.botpress || typeof window.botpress.open !== "function") {
      return;
    }

    const timer = setInterval(() => {
      if (!document.body.contains(webchat)) {
        clearInterval(timer);
        return;
      }

      const isOpen = isBotpressChatOpen();

      if (isOpen && !lastBotpressOpen) {
        sendScamContextToBotpress(true);
      }

      lastBotpressOpen = isOpen;
    }, 500);
  }

  function isBotpressChatOpen() {
    return getFloatingCandidates(document.body).some((element) => {
      const marker = [
        element.id,
        element.className,
        element.getAttribute("title"),
        element.getAttribute("name"),
        element.getAttribute("src"),
        element.getAttribute("aria-label")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return (
        isBotpressElement(marker) &&
        style.position === "fixed" &&
        rect.width >= 280 &&
        rect.height >= 360 &&
        rect.bottom >= window.innerHeight - 180
      );
    });
  }

  function moveFloatingBotpressToLeft() {
    const candidates = getFloatingCandidates(document.body);

    candidates.forEach((element) => {
      const marker = [
        element.id,
        element.className,
        element.getAttribute("title"),
        element.getAttribute("name"),
        element.getAttribute("src"),
        element.getAttribute("aria-label")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const style = window.getComputedStyle(element);

      if (style.position !== "fixed" || (!isBotpressElement(marker) && !isBottomRightWidget(element, style))) {
        return;
      }

      element.style.right = "auto";
      element.style.left = "24px";
    });
  }

  function getFloatingCandidates(root) {
    const elements = Array.from(root.querySelectorAll("iframe, button, div, section"));

    elements.forEach((element) => {
      if (element.shadowRoot) {
        elements.push(...getFloatingCandidates(element.shadowRoot));
      }
    });

    return elements;
  }

  function isBotpressElement(marker) {
    return marker.includes("botpress") || marker.includes("bp-web") || marker.includes("webchat");
  }

  function isBottomRightWidget(element, style) {
    const rect = element.getBoundingClientRect();
    const zIndex = Number(style.zIndex);
    const isVisible = rect.width > 0 && rect.height > 0;
    const isWidgetSize = rect.width >= 44 && rect.width <= 620 && rect.height >= 44 && rect.height <= 820;
    const isOnRight = rect.right >= window.innerWidth - 180;
    const isNearBottom = rect.bottom >= window.innerHeight - 180;
    const isOverlay = Number.isFinite(zIndex) && zIndex >= 100;

    return isVisible && isWidgetSize && isOnRight && isNearBottom && isOverlay && !webchat.contains(element);
  }

  function showError(message) {
    webchat.innerHTML = "";

    const error = document.createElement("div");
    error.className = "webchat-loading";
    error.innerHTML = `<p>${message}</p>`;
    webchat.appendChild(error);
  }

  function showReadyMessage() {
    webchat.innerHTML = "";

    const ready = document.createElement("div");
    ready.className = "webchat-loading";

    const message = document.createElement("p");
    message.textContent = "SparkleBot is ready.";

    const note = document.createElement("p");
    note.className = "form-note";
    note.textContent = "Use the chat button on this page to start a conversation.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary";
    button.textContent = "Open SparkleBot";
    button.addEventListener("click", () => {
      if (window.botpress && typeof window.botpress.open === "function") {
        window.botpress.open();
        sendScamContextToBotpress(true);
      }
    });

    ready.appendChild(message);
    ready.appendChild(note);

    ready.appendChild(button);
    webchat.appendChild(ready);
  }

  function waitForBotpress() {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (window.botpress && typeof window.botpress.open === "function") {
          clearInterval(timer);
          resolve();
          return;
        }

        if (Date.now() - startedAt > 15000) {
          clearInterval(timer);
          reject(new Error("Botpress did not load in time."));
        }
      }, 250);
    });
  }

  async function initBotpress() {
    try {
      submitLearningContextToN8n();
      await waitForBotpress();
      registerBotpressEvents();
      updateBotpressUserData();
      moveFloatingBotpressToLeft();
      watchBotpressOpenState();
      const observer = new MutationObserver(moveFloatingBotpressToLeft);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
      showReadyMessage();
    } catch (error) {
      showError("SparkleBot is unavailable right now.");
    }
  }

  initBotpress();
})();

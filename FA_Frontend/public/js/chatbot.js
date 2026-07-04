(function () {
  const webchat = document.getElementById("sparklebot-webchat");

  if (!webchat) {
    return;
  }

  const handoffPrompt = webchat.dataset.handoffPrompt || "";

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
    note.textContent = handoffPrompt
      ? "Open SparkleBot, then paste the copied scam context to continue the guidance."
      : "Use the chat button on this page to start a conversation.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary";
    button.textContent = "Open SparkleBot";
    button.addEventListener("click", () => {
      if (window.botpress && typeof window.botpress.open === "function") {
        window.botpress.open();
      }
    });

    ready.appendChild(message);
    ready.appendChild(note);

    if (handoffPrompt) {
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "btn btn-secondary";
      copyButton.textContent = "Copy scam context";
      copyButton.addEventListener("click", copyHandoffPrompt);
      ready.appendChild(copyButton);
    }

    ready.appendChild(button);
    webchat.appendChild(ready);
  }

  async function copyHandoffPrompt() {
    if (!handoffPrompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(handoffPrompt);
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = handoffPrompt;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
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
      await waitForBotpress();
      showReadyMessage();
    } catch (error) {
      showError("SparkleBot is unavailable right now.");
    }
  }

  initBotpress();

  document.querySelectorAll("[data-copy-handoff]").forEach((button) => {
    button.addEventListener("click", copyHandoffPrompt);
  });
})();

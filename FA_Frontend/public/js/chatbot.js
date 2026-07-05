(function () {
  const webchat = document.getElementById("sparklebot-webchat");

  if (!webchat) {
    return;
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
      await waitForBotpress();
      showReadyMessage();
    } catch (error) {
      showError("SparkleBot is unavailable right now.");
    }
  }

  initBotpress();
})();

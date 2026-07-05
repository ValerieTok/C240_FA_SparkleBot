const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav-links]");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });
}

const screenshotInput = document.getElementById("screenshotInput");
const modeTabs = document.querySelector("[data-mode-tabs]");
const resultPanels = document.querySelectorAll("[data-result-panel]");
const emptyResults = document.querySelector("[data-empty-results]");

function clearDetectorInputs() {
  const messageInput = document.getElementById("messageInput");
  const urlInput = document.getElementById("urlInput");
  const notesInput = document.getElementById("notesInput");
  const preview = document.getElementById("screenshotPreview");
  const previewCard = document.getElementById("screenshotPreviewCard");

  [messageInput, urlInput, notesInput].forEach((field) => {
    if (field) {
      field.value = "";
    }
  });

  if (screenshotInput) {
    screenshotInput.value = "";
  }

  if (preview) {
    preview.removeAttribute("src");
  }

  if (previewCard) {
    previewCard.classList.add("hidden");
  }
}

function clearDetectorResults() {
  resultPanels.forEach((panel) => {
    panel.dataset.hasResult = "false";
    panel.classList.add("hidden");
  });

  if (emptyResults) {
    emptyResults.classList.remove("hidden");
  }
}

function updateResultPanels(activeMode) {
  let hasVisibleResult = false;

  resultPanels.forEach((panel) => {
    const shouldShow = panel.dataset.resultPanel === activeMode && panel.dataset.hasResult === "true";
    panel.classList.toggle("hidden", !shouldShow);

    if (shouldShow) {
      hasVisibleResult = true;
    }
  });

  if (emptyResults) {
    emptyResults.classList.toggle("hidden", hasVisibleResult);
  }
}

if (screenshotInput) {
  screenshotInput.addEventListener("change", () => {
    const file = screenshotInput.files[0];
    const preview = document.getElementById("screenshotPreview");
    const previewCard = document.getElementById("screenshotPreviewCard");

    if (!file) {
      previewCard.classList.add("hidden");
      return;
    }

    preview.src = URL.createObjectURL(file);
    previewCard.classList.remove("hidden");
  });
}

if (modeTabs) {
  const tabLabels = modeTabs.querySelectorAll("[data-mode-tab]");
  const panels = document.querySelectorAll("[data-mode-panel]");

  tabLabels.forEach((label) => {
    const input = label.querySelector('input[type="radio"]');

    input.addEventListener("change", () => {
      clearDetectorInputs();
      clearDetectorResults();

      tabLabels.forEach((candidate) => {
        candidate.classList.toggle("active", candidate === label);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.modePanel !== input.value);
      });

      updateResultPanels(input.value);
    });
  });

  const activeInput = modeTabs.querySelector('input[type="radio"]:checked');

  if (activeInput) {
    updateResultPanels(activeInput.value);
  }
}

document.querySelectorAll("[data-analysis-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const submitButton = form.querySelector('button[type="submit"]');
    const loadingIndicator = form.querySelector("[data-analysis-loading]");

    form.setAttribute("aria-busy", "true");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Analyzing...";
    }

    if (loadingIndicator) {
      loadingIndicator.classList.remove("hidden");
    }
  });
});

document.querySelectorAll("[data-report-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const submitButton = form.querySelector('button[type="submit"]');
    const loadingIndicator = form.querySelector("[data-report-loading]");

    form.setAttribute("aria-busy", "true");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    if (loadingIndicator) {
      loadingIndicator.classList.remove("hidden");
    }
  });
});

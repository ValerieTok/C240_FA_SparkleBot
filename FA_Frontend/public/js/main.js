const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav-links]");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });
}

const screenshotInput = document.getElementById("screenshotInput");

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

document.querySelectorAll("[data-analysis-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const submitButton = form.querySelector('button[type="submit"]');
    const loadingIndicator = form.querySelector("[data-analysis-loading]");

    form.setAttribute("aria-busy", "true");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Analyzing…";
    }

    if (loadingIndicator) {
      loadingIndicator.classList.remove("hidden");
    }
  });
});

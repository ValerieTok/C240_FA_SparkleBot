# SparkleBot Scam Education Portal

SparkleBot is a Node.js and Express anti-scam education website. It helps users check suspicious content, learn from an AI chatbot, practise scam-response decisions, test their scam awareness, submit reports, and review scam and feedback trends.

The active website is located in [`FA_Frontend`](./FA_Frontend).

## Website Features

### Scam Detector

- Checks suspicious text, URLs, and screenshots.
- Supports optional notes that provide additional context for the analysis.
- Displays the detected risk level, scam type, red flags, and recommended actions returned by n8n.
- Sends high-risk results to a separate alert workflow when configured.
- Passes analysis context to SparkleBot for follow-up guidance.
- Accepts image uploads up to 5 MB.

### SparkleBot Guidance

- Embeds a Botpress webchat in the website.
- Provides follow-up learning prompts and scam-prevention guidance.
- Receives risk information from the Scam Detector through URL parameters.
- Can send recommended learning context to n8n.

### Personalised Scam Quiz

- Generates scam-awareness questions through n8n.
- Can be used as a guest or with an optional email address.
- Submits answers using a quiz session ID.
- Displays the score, percentage, strengths, weak categories, and a learning summary.
- Supports retaking the quiz with or without the same email address.

### AI Digital Twin

- Builds a scam persona from a questionnaire about the user's online habits.
- Generates a personalised risk profile and scam scenario.
- Lets the user choose how to respond and displays the simulated outcome, missed red flags, feedback, and safety tips.
- Can send results through configured email and Telegram workflows.

### Scam Reporting and Trends

- Collects the scam type, platform, incident details, and optional contact information.
- Submits reports to an n8n workflow.
- Displays report totals, common scam types, risk-level counts, and summarized trend insights.

### Feedback and Feedback Dashboard

- Records whether users found a website feature helpful.
- Accepts optional comments.
- Displays submission totals, helpfulness percentages, status counts, AI summaries, and a live feedback feed.

## Technology Stack

- Node.js
- Express 4
- EJS templates
- CSS and browser JavaScript
- Multer for image uploads
- n8n webhooks for workflow automation and AI-backed features
- Botpress Webchat for SparkleBot

The application uses Node's built-in `fetch`, so Node.js 18 or newer is recommended.

## Active Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Home dashboard |
| `GET` | `/checker` | Scam Detector page |
| `POST` | `/checker` | Analyze text, a URL, or an uploaded screenshot |
| `GET` | `/chatbot` | SparkleBot webchat page |
| `POST` | `/chatbot/recommended-learning-context` | Send learning context to n8n |
| `GET` | `/scam-quiz` | Personalised Scam Quiz page |
| `POST` | `/scam-quiz/start` | Request quiz questions from n8n |
| `POST` | `/scam-quiz/submit` | Submit and score quiz answers |
| `GET` | `/digital-twin` | AI Digital Twin simulator |
| `GET` | `/report-scam` | Scam report form |
| `POST` | `/report-scam` | Submit a scam report |
| `GET` | `/admin/scam-trends` | Scam Trends dashboard |
| `GET` | `/feedback` | Feedback form |
| `POST` | `/feedback` | Submit feedback |
| `GET` | `/feedback-dashboard` | Feedback analytics dashboard |
Unknown routes render the website's custom 404 page.

## Project Structure

```text
SparkleBot_Scam/
|-- README.md
|-- .gitignore
`-- FA_Frontend/
    |-- app.js                 # Express application entry point
    |-- package.json           # Dependencies and npm scripts
    |-- controllers/           # Page rendering and request handling
    |-- models/                # Page and homepage feature content
    |-- routes/                # Active Express routes and upload handling
    |-- services/              # n8n, Botpress, and Gemini service modules
    |-- views/
    |   |-- layout.ejs         # Shared page layout
    |   |-- pages/             # Page templates
    |   `-- partials/          # Shared navigation and footer templates
    `-- public/
        |-- css/               # Website styling
        |-- images/            # Static images
        |-- js/                # Browser-side scripts
        `-- uploads/           # Runtime screenshot uploads
```

## Installation

1. Open PowerShell in the active application directory:

   ```powershell
   cd C:\C240\SparkleBot_Scam\FA_Frontend
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create `FA_Frontend/.env` and add the configuration required by the features you want to use.

4. Start the development server:

   ```powershell
   npm run dev
   ```

   For a normal start without nodemon:

   ```powershell
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Environment Configuration

Do not commit `.env` or share real API keys and webhook identifiers. The repository's `.gitignore` excludes the environment file.

Create `FA_Frontend/.env` using the following template and replace only the values required by your setup:

```dotenv
# Server
SERVER_PORT=3000

# Scam Detector and alerts
N8N_SCAM_ANALYSIS_WEBHOOK_URL=https://your-n8n-host/webhook/scam-analysis
N8N_HIGH_RISK_WEBHOOK_URL=https://your-n8n-host/webhook/high-risk-alert

# Scam reports and dashboards
N8N_SCAM_REPORT_WEBHOOK_URL=https://your-n8n-host/webhook/scam-report
N8N_SCAM_TRENDS_WEBHOOK_URL=https://your-n8n-host/webhook/scam-trends

# Feedback
N8N_FEEDBACK_WEBHOOK_URL=https://your-n8n-host/webhook/feedback
N8N_GET_FEEDBACK_ANALYTICS_URL=https://your-n8n-host/webhook/feedback-analytics

# Recommended learning and quiz
N8N_RECOMMENDED_LEARNING_WEBHOOK_URL=https://your-n8n-host/webhook/recommended-learning
N8N_SCAM_QUIZ_WEBHOOK_URL=https://your-n8n-host/webhook/scam-quiz

# Botpress webchat
BOTPRESS_WEBCHAT_INJECT_URL=https://cdn.botpress.cloud/webchat/v3.2/inject.js
BOTPRESS_WEBCHAT_CONFIG_URL=https://files.bpcontent.cloud/your-webchat-config.js

# AI Digital Twin
VITE_N8N_WEBHOOK_URL=https://your-n8n-host/webhook/scam-persona-questionnaire
VITE_N8N_CHOICE_WEBHOOK_URL=https://your-n8n-host/webhook/scam-persona-choice
NEXT_PUBLIC_N8N_EMAIL_WEBHOOK_URL=https://your-n8n-host/webhook/send-results-email
NEXT_PUBLIC_N8N_TELEGRAM_WEBHOOK_URL=https://your-n8n-host/webhook/send-results-telegram
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username

# Optional Gemini service configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

The Scam Detector also recognizes `N8N_SCAM_DETECTOR_WEBHOOK_URL` and `N8N_CHECKER_WEBHOOK_URL` as fallback names. The recommended-learning integration recognizes `N8N_SCAM_LEARNING_WEBHOOK_URL` as a fallback.

## n8n Webhook Notes

- Use `/webhook/` URLs for active production workflows.
- `/webhook-test/` URLs normally work only while the corresponding workflow is listening for a test event in n8n.
- The quiz workflow must support both `start_quiz` and `submit_quiz` actions.
- Dashboard workflows must return valid JSON in the fields expected by the frontend.
- Features with missing or unavailable webhooks display a user-friendly error or default dashboard values.

## Available npm Scripts

Run these commands from `FA_Frontend`:

| Command | Description |
| --- | --- |
| `npm start` | Start the Express server with Node.js |
| `npm run dev` | Start the server with nodemon and reload after file changes |

There is currently no automated `npm test` script.

## Common Problems

### Port 3000 is already in use

If startup fails with `EADDRINUSE`, another process is already listening on the configured port. Stop the older server or use another port:

```dotenv
SERVER_PORT=3001
```

### An n8n webhook returns HTTP 404

Confirm that the workflow is active and that the environment variable uses its production `/webhook/` URL. For a `/webhook-test/` URL, start listening for a test event before sending the request.

### Botpress does not appear

Verify both `BOTPRESS_WEBCHAT_INJECT_URL` and `BOTPRESS_WEBCHAT_CONFIG_URL`. The webchat config URL is separate from backend Botpress webhook identifiers.

### Screenshot analysis fails

Upload an image file no larger than 5 MB and confirm that the Scam Detector n8n workflow is active.

## Privacy and Deployment Considerations

- Uploaded screenshots are saved under `FA_Frontend/public/uploads` and should be cleaned according to the deployment's retention policy.
- Avoid placing private information in scam reports, quiz emails, feedback comments, or screenshots unless the connected workflows are approved to process it.
- Add authentication and authorization before exposing analytics routes as restricted administrative dashboards in a public deployment.
- Keep all API keys and webhook configuration in environment variables.

## Development and Design Tools

### Codex

Codex is used as a software development assistant for the project. It supports the team by reviewing the existing codebase, implementing website features, debugging errors, updating routes and interfaces, improving documentation, and verifying that changes match the current Express and EJS application structure. All generated changes are reviewed and tested by the project team before use.

### ChatGPT

ChatGPT is used to support the creation of the project poster. It helps organize the poster content, summarize the project's problem statement and features, improve wording, and present technical information in a clear format for the intended audience. The project team reviews and edits the generated poster content before including it in the final design.

## License

This project is licensed under the MIT License as declared in `FA_Frontend/package.json`.

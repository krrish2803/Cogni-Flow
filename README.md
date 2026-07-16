# Socratic Scaffold

Socratic Scaffold is an AI learning process agent for coding and reasoning-heavy education. It does not optimize for giving the fastest answer. It helps a learner reason, act, explain, and demonstrate understanding before it validates a final solution.

## Problem statement

Answer-first AI tools make it easy to finish homework, code tasks, and practice questions quickly. That convenience often hides a learning problem: students can submit polished work without understanding the reasoning behind it. The result is false confidence, weak retention, reduced independent problem-solving, and less reliable assessment for educators.

## Proposed solution

Socratic Scaffold changes the AI interaction from answer delivery into a guided learning loop:

1. **Diagnose** the learner’s current knowledge and likely misconception.
2. **Scaffold** the next useful thought with a minimal Socratic hint.
3. **Require action** through a checkpoint, explanation, code attempt, or mini-practice task.
4. **Evaluate evidence** using an AI rubric and update the learner state.
5. **Validate mastery** before allowing a final answer or marking the concept complete.

The product’s core promise is simple: **not an answer bot—a learning process agent.**

## Market impact

- **Students:** Build durable understanding, stronger coding fluency, and confidence earned through practice.
- **Educators:** See evidence of reasoning, misconception patterns, checkpoints, and mastery instead of only finished answers.
- **EdTech platforms:** Add trustworthy active-learning workflows to AI tutoring experiences.
- **AI education market:** Shift AI assistance from passive answer consumption toward measurable skill building and more credible assessment.

## Product surfaces

| Surface | Purpose |
| --- | --- |
| Landing page | Explains the product vision, problem, solution, impact, and differentiator. |
| Student workspace | Lets a student create sessions, ask questions, receive scaffolded AI guidance, complete checkpoints, and view learning progress. |
| Educator dashboard | Shows learning evidence: sessions, hints, checkpoints, mastery, misconceptions, explain-back scores, and actions. |
| REST API | Provides auth, conversation, AI tutoring, learning state, evidence, practice, and dashboard capabilities. |

## Tech stack

- **Frontend:** Semantic HTML, CSS, vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT access tokens, rotating refresh tokens, bcrypt password hashes
- **AI:** NVIDIA chat-completions API with structured JSON responses
- **Security:** Helmet, CORS, rate limiting, Zod validation, HTTP-only cookies, RBAC
- **Operations:** Docker Compose, Pino logs, health check, seed script, Jest smoke test

## AI-assisted development: Codex and GPT-5 series

Codex accelerated the build from product brief to working hackathon MVP by helping turn the learning-science concept into a coherent full-stack implementation. The product direction, learner-first workflow, and success criteria remained the key design decisions; Codex accelerated the execution, integration, and verification work.

| Area | How Codex accelerated the workflow |
| --- | --- |
| Product-to-architecture translation | Converted the product requirements into a modular Express, MongoDB, NVIDIA AI, and static-frontend architecture. |
| Learning workflow design | Helped formalize the core state machine: diagnose → scaffold → require action → evaluate → validate mastery. |
| Backend implementation | Generated and connected schemas, controllers, services, routes, validation, RBAC, token handling, logging, and rate limits. |
| Prompt engineering | Structured reusable prompts for diagnosis, hint levels, action evaluation, practice generation, mastery validation, explain-back, and mistake analysis. |
| Demo experience | Built the student workspace and educator evidence dashboard so judges can immediately see both the learner experience and the measurable impact. |
| Quality assurance | Assisted with dependency setup, static checks, automated health testing, and live end-to-end verification against MongoDB Atlas and NVIDIA. |

### Key implementation decisions

- **Action-gated tutoring over answer-first chat:** Direct answers are restricted in strict mode until there is evidence of learner progress.
- **Learning evidence as a first-class data model:** The backend stores actions, explain-backs, practice attempts, mastery records, misconceptions, and hint history—not only chat messages.
- **Separate student and educator views:** The learner workspace optimizes for thinking and practice, while the dashboard makes educational outcomes legible to teachers and judges.
- **Structured NVIDIA outputs:** AI endpoints use JSON contracts so tutoring modes, checkpoints, expected actions, concepts, and mastery updates can safely drive the UI and database.
- **Production-minded MVP baseline:** JWT auth, rotating refresh tokens, Zod validation, rate limits, error handling, logging, Docker support, and health checks are included from the start.

> This implementation was developed with Codex using a GPT-5-series model. If your submission platform requires an exact model label such as “GPT-5.6,” update this line to match the model identifier shown in your development environment rather than claiming an unverified version.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and add your local credentials. Never commit `.env`.

```bash
cp .env.example .env
```

Required values:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/socratic-scaffold
JWT_SECRET=use-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
NVIDIA_API_KEY=your-nvidia-key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
CLIENT_URL=http://localhost:4000
STRICT_TUTOR_MODE=true
```

> For MongoDB Atlas passwords containing reserved URL characters such as `@`, encode them in the URI (for example, `@` becomes `%40`).

### 3. Start MongoDB

Use local MongoDB or Docker:

```bash
docker compose up -d mongo
```

### 4. Seed demo accounts

```bash
npm run seed
```

The seed command creates:

- Student: `student@socratic.local` / `SecureDemo123`
- Educator: `educator@socratic.local` / `SecureDemo123`

It also prints the student ID needed for the educator dashboard lookup.

### 5. Start the app

```bash
npm run dev
```

Open these pages in a browser:

- Landing page: `http://localhost:4000/`
- Student workspace: `http://localhost:4000/workspace.html`
- Educator dashboard: `http://localhost:4000/dashboard.html`
- Health check: `http://localhost:4000/health`

## How to use the product

### Student workflow

1. Open `/workspace.html` and register or sign in as a student.
2. Start a new learning session.
3. Ask a coding question, for example: “Can you write binary search for me?”
4. Read the diagnosis or hint and answer the checkpoint instead of requesting a direct solution.
5. Continue through action-gated prompts while the product updates mastery, confidence, concepts, and evidence.

### Educator workflow

1. Open `/dashboard.html` and sign in with an `educator` or `admin` account.
2. Enter a student’s MongoDB ID.
3. Review the evidence dashboard for hints used, checkpoints completed, mastery records, misconceptions, explain-back scores, and recent learner actions.

## API overview

All API routes are namespaced below `/api`. Protected endpoints require an `Authorization: Bearer <access-token>` header or the authenticated cookie.

| Module | Example endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` |
| Profiles | `GET/PATCH /users/profile` |
| Conversations | `POST/GET /conversations`, `GET /conversations/:id`, `PATCH /conversations/:id/archive` |
| Learning state | `GET /learning-state/me`, `GET /learning-state/dashboard/me` |
| Tutor | `POST /tutor/respond`, `/diagnosis/run`, `/hints/generate`, `/actions/submit` |
| Adaptive hints | `POST /learning/adaptive-hint-ladder` uses conversation, learner state, and mistake evidence to return a personalized four-level ladder plus an educator-readable rationale. |
| Concept graph | `POST /learning/concept-map-update` infers prerequisite evidence and next concepts, persists the learner graph, and powers the interactive concept-map view. |
| Mistake predictor | `POST /learning/predict-next-mistake` analyzes cross-session evidence to flag a likely next mistake and recommend a short preventive micro-practice. |
| Explain-back rubric | `POST /learning/evaluate-explain-back` generates a level-appropriate rubric, scores a learner explanation by criterion, and stores transparent feedback as educator evidence. |
| Session replay | `GET /analytics/session-replay/:sessionId` returns an ordered evidence timeline for the animated educator replay player. |
| Practice and mastery | `POST /practice/generate`, `/practice/:id/submit`, `/mastery/validate`, `/explain-back/evaluate` |
| Evidence | `GET /dashboard/student/:id`, `/dashboard/conversation/:id`, `/dashboard/overview` |

See [docs/API.md](docs/API.md) for examples and response-contract details.

## Testing

Run the automated smoke test:

```bash
npm test
```

The project has also been live-tested with MongoDB Atlas and NVIDIA for registration, login, refresh-token rotation, conversations, learning state, diagnosis, tutor responses, hints, action evaluation, and educator dashboard evidence.

## File structure

```text
CogniFlow/
├── index.html                    # Premium product landing page
├── workspace.html                # Student AI tutoring workspace
├── dashboard.html                # Educator/judge evidence dashboard
├── public/
│   ├── app.css                   # Shared visual system
│   └── app.js                    # Shared authenticated API client
├── src/
│   ├── app.js                    # Express configuration, security, static files
│   ├── server.js                 # Database connection and server startup
│   ├── config/                   # Environment and MongoDB configuration
│   ├── controllers/              # HTTP request/response handlers
│   ├── middleware/               # Auth, validation, and error middleware
│   ├── models/                   # MongoDB schemas and learning records
│   ├── prompts/                  # Structured NVIDIA prompt templates
│   ├── routes/                   # REST API route definitions
│   ├── services/                 # AI, tutor, and learning-state orchestration
│   ├── utils/                    # API response, errors, async helpers
│   └── validators/               # Zod request schemas
├── scripts/
│   └── seed.js                   # Demo student and educator seed data
├── tests/
│   └── health.test.js            # Health endpoint smoke test
├── docs/API.md                   # API contract notes
├── .env.example                  # Environment variable template
├── docker-compose.yml            # API and MongoDB local stack
├── Dockerfile                    # API container image
└── package.json                  # Scripts and dependencies
```

## Security notes

- Keep `.env` private; it is excluded by `.gitignore`.
- Rotate any API key or database credential ever shared in chat, screenshots, commits, or logs.
- Use a unique long `JWT_SECRET` in every environment.
- Before a production release, connect the password-reset flow to an email provider, add broader integration coverage, and configure monitoring/alerting.

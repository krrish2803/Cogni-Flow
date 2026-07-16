# Socratic Scaffold Architecture

Socratic Scaffold is an AI learning platform that guides learners through explanation, practice, feedback, and mastery evidence rather than immediately returning answers.

## System Overview

```mermaid
flowchart LR
  Browser["Browser\nStudent · Educator · Admin"] --> Web["Express Static Frontend\nHTML + CSS + JavaScript"]
  Web --> API["Express API\nJWT authentication · RBAC · validation"]
  API --> Mongo["MongoDB Atlas\nUsers · Sessions · Learning Evidence"]
  API --> AI["NVIDIA NIM\nmeta/llama-3.1-8b-instruct"]
  API --> Metrics["In-memory API Telemetry\nLatency · success rate"]
```

## Role-Based Entry Flow

```mermaid
flowchart TD
  Landing["Landing Page"] --> Workspace["Try Workspace"]
  Workspace --> Auth{"Sign in or register"}
  Auth -->|"Student role"| Student["Student Workspace"]
  Auth -->|"Educator role"| Educator["Educator Dashboard"]
  Auth -->|"Admin role"| Admin["Admin Dashboard"]
  Student --> StudentDash["Student Dashboard"]
  Educator --> Queue["Teacher Intervention Queue"]
  Admin --> Platform["Platform Metrics + All Students"]
```

## Student Tutoring Flow

```mermaid
sequenceDiagram
  participant S as Student
  participant UI as Learning Workspace
  participant API as Tutor API
  participant AI as NVIDIA NIM
  participant DB as MongoDB

  S->>UI: Ask a question or answer a checkpoint
  UI->>API: POST /api/tutor/respond
  API->>DB: Load conversation + compact learning state
  API->>AI: Generate structured Socratic response
  AI-->>API: Hint / evaluation / next question
  API->>DB: Save messages, evidence, mastery signal
  API-->>UI: Response + learning state + system_info
  UI-->>S: Correct / needs-work feedback and next step
```

## Personalized Learning Loop

```mermaid
flowchart TD
  Question["Student question"] --> Diagnose["Diagnose knowledge gap"]
  Diagnose --> Hint["Adaptive Hint Ladder"]
  Hint --> Checkpoint["Student checkpoint answer"]
  Checkpoint --> Evaluate{"Correct?"}
  Evaluate -->|"Needs work"| Explain["Explain concept simply\n+ smaller follow-up question"]
  Explain --> Hint
  Evaluate -->|"Correct"| Practice["Generate targeted practice"]
  Practice --> ExplainBack["Explain-back rubric"]
  ExplainBack --> Mastery["Mastery validation"]
  Mastery --> Graph["Update Concept Graph\nUnlock next concepts"]
```

## Syllabus Upload to Learning Roadmap

```mermaid
flowchart LR
  File["PDF · DOC · DOCX · TXT\nMaximum 8 MB"] --> Upload["In-memory upload validation"]
  Upload --> Parse["Extract readable text\nPDF / DOC / DOCX parser"]
  Parse --> RoadmapAI["AI roadmap generation"]
  RoadmapAI --> Roadmap["3–6 phase study roadmap"]
  RoadmapAI --> Lesson["First guided lesson\nExplanation + example + checkpoint"]
  Lesson --> Workspace["Student answers in workspace"]
  Workspace --> Adaptive["Adaptive hints and evaluation"]
```

Uploaded source files are processed in memory and are not persisted by the application.

## Predictive Practice Workflow

```mermaid
flowchart TD
  Start["Student clicks Start Practice"] --> Predict["POST /api/learning/predict-next-mistake"]
  Predict --> Alert["Learning Assistant Alert\nRisk + likely misconception"]
  Alert --> Choice{"Student choice"}
  Choice -->|"Take it now"| Micro["2-minute targeted micro-lesson"]
  Choice -->|"Skip to practice"| Generate["Generate personalized practice"]
  Micro --> Generate
  Generate --> Submit["Practice answer / code submission"]
  Submit --> Grade["AI evaluation + feedback"]
  Grade -->|"Pass"| Evidence["Save mastery evidence"]
  Grade -->|"Retry"| Submit
```

## Educator and Admin Evidence Flow

```mermaid
flowchart LR
  Evidence["Learning evidence\nSessions · hints · practice · rubrics"] --> Educator["Educator Dashboard"]
  Educator --> Replay["Session Replay"]
  Educator --> Queue["Intervention Queue\nRisk-ranked learners"]
  Evidence --> Admin["Admin Dashboard"]
  Admin --> Stats["Students · sessions · mastery\nMisconceptions · hint effectiveness"]
  Admin --> Health["DB status · API latency\nSuccess rate · uptime"]
```

## Main Data Models

```mermaid
erDiagram
  USER ||--o{ CONVERSATION : owns
  USER ||--|| LEARNING_STATE : has
  USER ||--o{ PRACTICE_ITEM : receives
  USER ||--o{ MASTERY_RECORD : earns
  USER ||--o{ MISTAKE_PATTERN : develops
  CONVERSATION ||--o{ PRACTICE_ITEM : contains
  CONVERSATION ||--o{ TUTOR_ACTION_LOG : records
  CONVERSATION ||--o{ EXPLAIN_BACK_RECORD : captures

  USER {
    string name
    string email
    string role
    string currentLevel
  }
  CONVERSATION {
    string title
    string subject
    number masteryScore
    number checkpointsCompleted
  }
  LEARNING_STATE {
    number masteryProgress
    number confidenceLevel
    array weakConcepts
    array conceptGraph
  }
```

## Transparency Metadata

Every API response includes a `system_info` object with the active AI provider/model, Codex-generated UI component label, and request trace ID. In the browser, append `?debug=1` to a page URL to print that metadata in the developer console.

```mermaid
flowchart LR
  Response["API response"] --> Data["Feature data"]
  Response --> Info["system_info"]
  Info --> Model["AI provider + model"]
  Info --> Component["Codex UI component label"]
  Info --> Trace["Request trace ID"]
```

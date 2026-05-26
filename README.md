# PrepAI — AI-Powered Interview Preparation System

> **PrepAI** is a premium, next-generation mock interview preparation platform designed to help candidates conquer interviews. By leveraging real-time speech analytics, adaptive LLM personas, and deep semantic feedback, PrepAI transforms preparation from static Q&A reading to a dynamic, hyper-realistic, multi-sensory feedback loop.

---

## 🌟 Key Features

*   **🎙️ Immersive Vocal & Text Chamber**: Experience fully spoken interviews. High-fidelity Speech-to-Text (STT) and Text-to-Speech (TTS) synthesize realistic conversational interview sessions.
*   **🎭 Dynamic Interviewer Personas**: Train against varied examiner behavioral models:
    *   *Standard*: Objective and professional.
    *   *Friendly*: Encouraging, giving hints when stuck.
    *   *Stressful*: Fast-paced, challenging answers, testing under-pressure performance.
    *   *Technical*: Deep-dive inquisitions into architecture, edge cases, and code complexities.
*   **📄 Resume-Contextualization**: Upload your custom PDF resume. Our system parses candidate skills, work histories, and custom target role metrics to craft hyper-specific questions tailored to you.
*   **📊 STAR-Method Assessment**: Receive multi-dimensional feedback scores evaluating technical correctness, structure (Situation, Task, Action, Result), pacing, volume, and conversational filler usage (*uhs*, *ums*, *likes*).
*   **📈 Glassmorphic Progress Tracking**: Monitor and analyze performance markers over time using high-fidelity modern dashboards and trends analysis.

---

## 🗺️ Project Assets & Navigation

To navigate the implementation details, please explore the primary assets within this workspace:

*   📘 **[Comprehensive Technical Project Plan](file:///C:/Users/sorathiya%20dhruvin/OneDrive/Desktop/AI%20Interview/project_plan.md)**: Details the end-to-end blueprint, including system architecture, interactive Gantt roadmap, design tokens, Prisma database schemas, and exhaustive implementation checklists.

---

## 📂 Proposed Folder Directory

Once implementation begins, the repository is designed to follow this modern layout:

```text
ai-interview-system/
├── client/                     # Vite + React (Next.js) Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable dynamic UI (Dashboard, Session, Feedback)
│   │   ├── hooks/              # Speech-to-Text hooks, media recorders, visualizers
│   │   ├── styles/             # Premium Glassmorphism theme configurations
│   │   └── App.tsx
│   └── package.json
├── server/                     # Python FastAPI Backend API Service
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/            # Users, Resumes, Sessions, Feedbacks
│   │   ├── services/           # LLM Orchestrator, Whisper STT, ElevenLabs TTS
│   │   └── database/           # Prisma client schemas, connections
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml          # Container configuration for quick local launching
```

---

## 🚀 Getting Started (Planned Roadmap)

For local development setup, the following steps are detailed in the project plan:

1.  **Clone & Initialise**:
    ```bash
    git init
    ```
2.  **Environment Configuration**: Create a `.env` in both client and server roots with standard keys:
    ```ini
    DATABASE_URL="postgresql://user:pass@localhost:5432/prepai"
    GEMINI_API_KEY="your-gemini-key"
    ELEVENLABS_API_KEY="your-elevenlabs-key"
    DEEPGRAM_API_KEY="your-deepgram-key"
    ```
3.  **Local Execution**:
    Use `docker compose up --build` or spin up local instances:
    *   FastAPI: `uvicorn main:app --reload`
    *   React Client: `npm run dev`

# SalesMind — AI-Native CRM

SalesMind is a modern CRM platform that combines traditional contact and deal management with AI-powered automation. Built for solo founders, freelancers, and small-to-mid sales teams (2–20 reps), it provides intelligent pipeline insights, automated multi-channel outreach sequences, and dynamic data enrichment.

---

## Features

### Core CRM
- **Contacts & Companies** — Flexible record management with dynamic custom fields
- **Deals Pipeline** — Kanban board with drag-and-drop stage transitions and list view
- **Activity Timeline** — Full history of notes, stage changes, and AI actions per record
- **Team Management** — Multi-user workspaces with manager/rep roles and email-based invitations

### AI Capabilities
- **Pipeline Co-Pilot** — Ask questions about your pipeline in natural language (streaming chat)
- **AI Agent Actions** — Propose CRM mutations with approve/reject workflow
- **Lead Scoring** — Automated 0–100 scoring with next-best-action recommendations
- **Smart Enrichment** — Per-cell AI enrichment for contact and company data
- **AI Field Builder** — Create custom fields using natural language descriptions

### Automation
- **Sequence Builder** — Multi-step email and WhatsApp outreach with configurable triggers
- **Message Approvals** — AI drafts messages for human review before sending
- **Background Scheduler** — Automatic step progression for active sequences
- **Audit Log** — Complete trail of all AI actions with model attribution

### Security & Access
- **JWT Authentication** — Secure httpOnly cookie-based sessions with refresh tokens
- **Role-Based Access** — Managers see all workspace records; reps see only their own
- **Brute-Force Protection** — Account lockout after repeated failed login attempts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 3.4, Radix UI, React Router 7, React Query, Recharts, Framer Motion |
| Backend | Python FastAPI, Uvicorn (async) |
| Database | MongoDB (Motor async driver) |
| AI/LLM | Google Gemini (Pro + Flash) via multi-model router |
| Email | Resend API |
| Scheduling | APScheduler (AsyncIO) |

---

## Project Structure

```
project/
├── backend/
│   ├── server.py           # FastAPI application (all routes + models)
│   ├── llm.py              # Multi-model LLM router (Gemini)
│   ├── email_service.py    # Resend email integration
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend test suite
├── frontend/
│   ├── src/
│   │   ├── App.js          # Router & layout
│   │   ├── pages/          # Page components (Dashboard, Records, Deals, etc.)
│   │   ├── components/     # Shared components (AppShell, CoPilot, etc.)
│   │   ├── components/ui/  # Radix UI primitives (shadcn/ui)
│   │   ├── context/        # Auth context provider
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # API client & utilities
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies
│   └── tailwind.config.js  # Design system tokens
├── memory/
│   └── PRD.md              # Product requirements document
└── tests/                  # Integration tests
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB instance
- Google Gemini API key
- Resend API key (for email features)

### Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=salesmind
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
FRONTEND_URL=http://localhost:3000
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

The frontend runs on port 3000 and connects to the backend at the URL specified by `REACT_APP_BACKEND_URL`.

---

## API Overview

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /api/auth/register`, `/login`, `/logout`, `/refresh`, `GET /api/auth/me` |
| Fields | `GET/POST /api/fields`, `DELETE /api/fields/:id`, `POST /api/fields/ai-build` |
| Records | `GET/POST /api/records`, `GET/PUT/DELETE /api/records/:id`, `POST /api/records/:id/enrich` |
| Deals | `POST /api/records/:id/score`, `POST /api/deals/score-all` |
| Activities | `GET /api/records/:id/activities`, `POST /api/activities` |
| Chat | `POST /api/chat` (streaming response) |
| Agent | `POST /api/agent/plan`, `GET /api/agent/actions`, `POST /api/agent/actions/:id/approve\|reject` |
| Sequences | `GET/POST /api/sequences`, `PUT /api/sequences/:id/toggle`, `POST /api/sequences/:id/enroll` |
| Messages | `GET /api/messages/pending`, `POST /api/messages/:id/approve\|reject` |
| Team | `GET /api/team`, `POST /api/invites`, `POST /api/invites/accept` |
| Audit | `GET /api/audit` |
| Stats | `GET /api/stats` |

---

## Design System

The application uses a distinctive inverted theme:
- **Sidebar**: Dark (#1A1918) with warm neutral tones
- **Content Area**: Light warm (#F9F8F6)
- **Accent**: Coral (#F05D48)
- **Border Radius**: 3px (sharp, consistent)
- **Typography**: IBM Plex Sans (body), DM Sans (headings), JetBrains Mono (code)

---

## Demo Accounts

On first startup, the system seeds demo accounts:
- **Manager**: `demo-manager@salesmind.ai` / `DemoManager2026!`
- **Rep**: `demo-rep@salesmind.ai` / `DemoRep2026!`

These come pre-loaded with sample contacts, companies, deals, and activities.

---

## Known Limitations

- WhatsApp delivery is simulated (no real Twilio integration)
- AI enrichment uses LLM inference only (no external data vendors)
- LLM support limited to Google Gemini models
- No real-time WebSocket updates (polling-based)
- Sequence auto-send lacks per-contact frequency caps

---

## License

Proprietary — All rights reserved.

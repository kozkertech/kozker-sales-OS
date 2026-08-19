# Architecture Overview

## System Diagram

```
┌─────────────────────────┐          ┌──────────────────────────┐
│     React Frontend      │          │     FastAPI Backend       │
│     (Port 3000)         │─── API ──│     (Port 8001)          │
│                         │  Axios   │                          │
│  - SPA with React Router│  + JWT   │  - 84 route handlers     │
│  - Tailwind + Radix UI  │ cookies  │  - Pydantic models       │
│  - React Query caching  │          │  - APScheduler (60s)     │
└─────────────────────────┘          └───────────┬──────────────┘
                                                  │
                                     ┌────────────┼────────────┐
                                     │            │            │
                               ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
                               │  MongoDB   │ │Gemini │ │  Resend   │
                               │  (Motor)   │ │  API  │ │   API     │
                               └───────────┘ └───────┘ └───────────┘
```

## Frontend Architecture

### Routing (React Router v7)
- `/login` — Authentication page
- `/register` — Account creation
- `/` — Dashboard with pipeline stats
- `/records` — Contacts/companies table with dynamic columns
- `/deals` — Kanban board + list view
- `/sequences` — Automation builder
- `/approvals` — Message approval queue
- `/team` — Workspace members & invitations
- `/audit` — AI action audit log
- `/accept-invite/:token` — Invitation acceptance

### State Management
- **React Query** — Server state (records, fields, activities)
- **React Context** — Authentication state (user session)
- **Local state** — UI interactions (modals, forms, filters)

### Key Components
- `AppShell` — Layout wrapper with sidebar navigation
- `CoPilot` — Global AI chat panel (slide-in from right)
- `RecordDrawer` — Side panel for record details + timeline
- `FieldBuilderDialog` — AI-powered custom field creation
- `AIChatPanel` — Streaming chat interface

## Backend Architecture

### Single-File Design
The backend is a monolithic `server.py` (1546 lines) containing:
- Pydantic models for request/response validation
- Route handlers organized by domain (auth, records, fields, etc.)
- Middleware (CORS, authentication)
- Background scheduler configuration
- Database initialization and seeding

### Authentication Flow
1. User submits credentials → `POST /api/auth/login`
2. Server validates bcrypt hash + checks lockout
3. Issues JWT access token (12h) + refresh token (7d) in httpOnly cookies
4. Frontend reads user from `/api/auth/me` on mount
5. Token refresh via `/api/auth/refresh` when access token expires

### Database Schema (MongoDB Collections)
- `users` — Accounts with bcrypt hashes, roles, workspace IDs
- `workspaces` — Team containers with settings
- `fields` — Dynamic field definitions per object type
- `records` — Contacts, companies with flexible `data` field
- `activities` — Timeline events per record
- `deals` — Pipeline stages, scores, enrollment status
- `sequences` — Automation definitions with steps
- `enrollments` — Active sequence enrollments
- `messages` — Pending/sent messages
- `invites` — Team invitation tokens
- `agent_actions` — AI-proposed mutations
- `audit_log` — All tracked events

### AI Integration (llm.py)
Multi-model router supporting:
- **Gemini Pro** — Complex tasks (chat, agent planning, scoring)
- **Gemini Flash** — Lightweight tasks (enrichment, field suggestions)

Capabilities:
- Streaming responses for chat interface
- Structured JSON output for agent actions
- System prompts with pipeline context injection

### Background Jobs (APScheduler)
- 60-second interval check for due enrollment steps
- Processes sequences marked as active
- Respects step delays and trigger conditions
- Sends via Resend (email) or simulates (WhatsApp)

## Security Model

### Access Control
- JWT tokens in httpOnly, Secure, SameSite=None cookies
- Role-based data filtering (manager=all, rep=owned only)
- Workspace isolation via `workspace_id` on all queries
- Brute-force lockout: 5 failed attempts → 15-minute lock

### API Security
- CORS restricted to frontend origin
- All mutation endpoints require valid JWT
- Input validation via Pydantic models
- MongoDB injection prevention via typed queries

## Data Flow Examples

### Creating a Record
1. User fills form in frontend
2. `POST /api/records` with object_type + data
3. Server validates fields exist, assigns owner + workspace
4. Record saved to MongoDB with timestamps
5. Activity created ("record_created")
6. React Query cache invalidated → UI refreshes

### AI Chat Query
1. User types question in CoPilot
2. `POST /api/chat` with message + conversation history
3. Server fetches pipeline context (records, deals, stats)
4. Constructs system prompt with context injection
5. Streams Gemini response back via `StreamingResponse`
6. Frontend renders tokens incrementally

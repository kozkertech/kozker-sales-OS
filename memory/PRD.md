# SalesMind — Product Requirements (living doc)

## Original problem statement
AI-Native CRM (Folk/Clay-inspired) with dynamic fields + AI field creation, multi-channel
automated engagement (Email + WhatsApp), agentic "ask your pipeline anything" chat, RBAC,
audit logs, and tiered autonomy guardrails. Web workspace + mobile AI companion.

## Architecture
- Backend: FastAPI (async) + MongoDB (flexible schema for dynamic/AI fields). `backend/server.py`, LLM router `backend/llm.py`.
- Frontend: React (CRA/craco) + Tailwind. Two-register design (quiet light + operational dark), coral accent, IBM Plex / DM Sans / JetBrains Mono.
- Auth: JWT via httpOnly cookies. Multi-tenant workspaces. RBAC: manager (sees all workspace records) vs rep (owned only).
- AI: multi-model router (currently Gemini-only per key entitlement) — Gemini 3.1 Pro for chat/agentic, Gemini 3 Flash for cheap enrichment/field-building.

## User personas
- Solo founders / freelancers · Small sales teams (2–20 reps) · Mid-market (managers + reps, RBAC).

## Core requirements (static)
Dynamic fields + AI field builder · CRM foundation (contacts/companies/deals, pipelines, timeline) ·
Automated engagement (Email + WhatsApp sequences, tiered autonomy) · AI pipeline chat · Trust & safety (RBAC, audit, opt-out).

## Implemented (2026-06)
- JWT auth (register/login/logout/me/refresh), brute-force lockout, admin seed (govind.developer@kozker.com).
- Workspaces + RBAC scoping (manager vs rep) with tenant isolation (verified: cross-tenant 404).
- Dynamic fields per object type (contact/company/deal): manual + AI "Use AI" builder + AI suggestions.
- Records CRUD with dynamic data; Claygent-style AI cell enrichment.
- Deals kanban (drag-to-move) + list view; activity timeline; note-taking.
- AI pipeline chat (streaming) "ask your pipeline anything".
- Audit log of AI actions + record changes with model attribution.
- Dashboard: pipeline stats, stage distribution, recent activity.
- **AI Actions (approval)**: /agent/plan proposes create_task/update_deal/add_note; approve executes, reject discards. Approver restricted to requester or manager.
- **Lead scoring**: per-deal + score-all → close score (0-100) + next-best-action on kanban cards.
- **Team invites**: managers invite reps via real Resend email; /accept-invite flow creates rep in same workspace. Members + pending invites UI.
- **Sequence builder**: Email + WhatsApp steps, triggers (manual/no_reply/stage/link), autonomy (approval-gated default / auto). Enroll → AI-drafts message → Approvals queue → approve sends REAL email (Resend) / MOCKED WhatsApp.
- Two full E2E test passes: iteration_1 18/18, iteration_2 25/25 backend + 8/8 frontend.

## Backlog (prioritized)
- P1: Background scheduler to actually fire time/stage/event triggers (currently manual enroll). Consider .emergent/crons.yml.
- P1: Real WhatsApp transport (Twilio Cloud API) behind the existing provider-agnostic layer — currently MOCKED.
- P1: Autonomous-mode guardrails execution (rate limits, daily caps, per-contact frequency, kill-switch) — defined in UI, not enforced yet.
- P2: Multi-step sequence progression (step 2+ after delays), waterfall enrichment with real vendors, Gmail/Outlook + calendar sync, mobile AI companion.
- P2: Refactor server.py into routers; parallelize score-all (asyncio.gather) for large workspaces.
- P2: Restore Claude/OpenAI routing when key entitlement allows (router already abstracted).

## Notes / known limitations
- WhatsApp sending is MOCKED (approve returns "WhatsApp (simulated — no real send)").
- Email sending is REAL via Emergent-managed Resend; demo contacts use deliverable delivered+<name>@resend.dev addresses.
- Sequence enrollment/first-step is manual; no background trigger scheduler yet.
- Enrichment infers values from the LLM's own knowledge (no external data vendor wired yet).

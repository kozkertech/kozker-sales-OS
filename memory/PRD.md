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
- 100% pass on first E2E test run (18 backend / 11 frontend).

## Backlog (prioritized)
- P0: Team invites + assigning a `rep` role to invited users (RBAC is enforced but no invite UI yet).
- P1: Automated engagement — sequence builder, triggers (time/stage/event), Email (Resend) + WhatsApp (Twilio Cloud API) real sends; currently NOT built.
- P1: Approval-gated AI message drafts + tiered autonomy guardrails (rate limits, daily caps, kill-switch).
- P1: Agentic chat writes (create/update via approval) — chat is currently read/advisory only.
- P2: Waterfall enrichment with real vendors (Apollo/Clearbit); Gmail/Outlook + calendar sync; mobile AI companion; analytics/lead scoring.
- P2: Restore Claude/OpenAI routing when key entitlement allows (router already abstracted).

## Notes / known limitations
- Email + WhatsApp sending NOT implemented in this MVP (was deferred to a later phase).
- Enrichment infers values from the LLM's own knowledge (no external data vendor wired yet).

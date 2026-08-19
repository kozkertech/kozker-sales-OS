# Changelog

## v0.1.0 — Initial Release

### Core CRM
- Contact and company record management with CRUD operations
- Dynamic custom fields (text, number, email, phone, date, select, boolean)
- AI-powered field builder with natural language descriptions
- Full-text search and object type filtering

### Deals Pipeline
- Kanban board view with drag-and-drop stage transitions
- List view with sortable columns
- AI lead scoring (0–100) with next-best-action recommendations
- Bulk scoring across all deals

### AI Features
- Pipeline co-pilot with streaming chat interface
- AI agent that proposes CRM mutations (with approve/reject workflow)
- Per-cell data enrichment via LLM inference
- Smart field suggestions based on existing data patterns

### Sequences & Automation
- Multi-step sequence builder (email + WhatsApp)
- Configurable triggers: manual, no-reply, stage change, link click
- Tiered autonomy: approval-gated or auto-send modes
- Background scheduler for automatic step progression
- Contact enrollment with de-duplication

### Team & Collaboration
- Email-based team invitations via Resend
- Manager and rep role separation
- Workspace isolation for multi-tenant support
- Message approval queue for AI-drafted outreach

### Security
- JWT authentication with httpOnly cookie sessions
- Access + refresh token rotation
- Brute-force login protection (5 attempts, 15-min lockout)
- Role-based record visibility (managers see all, reps see owned)

### Observability
- Full audit log of AI actions and record mutations
- Model attribution on all AI-generated content
- Activity timeline per record with event types

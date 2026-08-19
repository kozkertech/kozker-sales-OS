# Development Guide

## Local Development

### System Requirements
- Node.js 18+ (22 recommended)
- Python 3.11+
- MongoDB 6+ (local or Atlas)
- npm with `--legacy-peer-deps` flag (required due to date-fns/react-day-picker version mismatch)

### Running the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The server auto-seeds demo accounts and sample data on first start.

### Running the Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Opens at `http://localhost:3000`. Hot-reloads on file changes.

### Required Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `MONGO_URL` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes (default: `test_database`) |
| `JWT_SECRET` | Token signing key | Yes |
| `GEMINI_API_KEY` | Google Gemini API | Yes (for AI features) |
| `RESEND_API_KEY` | Resend email service | Yes (for email sending) |
| `FRONTEND_URL` | Frontend origin for CORS | Yes |
| `REACT_APP_BACKEND_URL` | Backend URL for frontend | Yes |

---

## Code Conventions

### Frontend
- **Components**: PascalCase filenames, one component per file
- **Pages**: Located in `src/pages/`, map 1:1 with routes
- **UI Primitives**: Radix-based components in `src/components/ui/`
- **API Calls**: Centralized in `src/lib/api.js` using Axios
- **Styling**: Tailwind CSS utility classes, design tokens in `tailwind.config.js`
- **State**: React Query for server data, Context for auth only

### Backend
- **Framework**: FastAPI with async route handlers
- **Validation**: Pydantic models for all request/response bodies
- **Database**: Motor (async MongoDB driver) with direct collection access
- **Auth**: JWT in httpOnly cookies, `get_current_user` dependency injection
- **Error Handling**: HTTPException with appropriate status codes

---

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

Test files:
- `tests/backend_test.py` — Core API endpoint tests
- `tests/test_demo_accounts.py` — Demo seeding verification
- `tests/test_iteration2.py` — Feature iteration tests

### Frontend Tests

```bash
cd frontend
npm test
```

Uses React Testing Library via CRA's built-in Jest configuration.

---

## Dependency Notes

### Frontend
- `date-fns` v4 conflicts with `react-day-picker` v8 peer dependency. Use `--legacy-peer-deps` for installation.
- `ajv` v8 must be explicitly installed for webpack/schema-utils compatibility with Node 22.
- `@craco/craco` wraps CRA for Tailwind CSS PostCSS configuration.

### Backend
- `emergentintegrations` is a platform-specific package (not available on public PyPI). The LLM module (`llm.py`) imports from it but falls back gracefully in environments where it's unavailable.
- `litellm` is installed from a custom wheel URL.

---

## Deployment

The application is designed to run on the Emergent Agent platform:
- Backend: Single Uvicorn process on port 8001
- Frontend: Static build served from port 3000
- MongoDB: Provided by the platform
- Secrets: Managed via platform environment variables

For production deployment elsewhere:
1. Build the frontend: `cd frontend && npm run build`
2. Serve the `build/` directory with any static file server
3. Run the backend with `uvicorn server:app --host 0.0.0.0 --port 8001`
4. Configure a reverse proxy (nginx/Caddy) to route API and frontend traffic

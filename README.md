# Sales OS (SalesMind) — Production Ready

SalesMind is an intelligent AI Sales Operating System and modern CRM featuring dynamic custom fields, Kanban deal pipelines, lead scoring, automated email sequences, and AI co-pilot chat.

---

## 🏗 Architecture

```text
Vercel (React 19 SPA)  ──HTTPS──▶  Cloud FastAPI (Render / Railway)  ──mongodb+srv://──▶  MongoDB Atlas
```

- **Frontend**: React 19 SPA, Tailwind CSS, Lucide icons, Radix UI primitives, client-side SPA routing (`vercel.json`), and dual-layer auth (Bearer token headers + cross-origin cookies).
- **Backend**: FastAPI with Uvicorn, async Motor MongoDB client, dynamic port binding (`0.0.0.0:$PORT`), CORS origin matching, `/health` monitoring, and APScheduler sequence engine.
- **Database**: MongoDB Atlas with automatic indexing and connection resilience.

---

## 🚀 Cloud Deployment Guide

### 1. MongoDB Atlas Setup
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Allow network access (`0.0.0.0/0`) and create a database user.
3. Obtain your connection string:
   ```text
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
4. Test and verify connection:
   ```bash
   python backend/test_atlas_connection.py --uri "<YOUR_MONGODB_URI>" --db salesmind
   ```
5. *(Optional)* Migrate local data to Atlas:
   ```bash
   # Export local data
   python backend/export_db.py --uri "mongodb://localhost:27017" --db salesmind
   # Import to Atlas
   python backend/import_db.py --uri "<YOUR_MONGODB_URI>" --db salesmind
   ```

---

### 2. Deploy Backend to Render / Railway
1. Push repository to GitHub.
2. In [Render](https://render.com), create a **New Web Service** (or deploy via blueprint `render.yaml`):
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Set Environment Variables:
   - `MONGODB_URI`: `<your-mongodb-atlas-uri>`
   - `MONGODB_DATABASE`: `salesmind`
   - `JWT_SECRET`: `<generate-a-secure-jwt-secret>`
   - `COOKIE_SECURE`: `true`
   - `ENVIRONMENT`: `production`
   - `ADMIN_EMAIL`: `govind.developer@kozker.com`
   - `ADMIN_PASSWORD`: `<your-secure-password>`
   - `FRONTEND_URL`: `https://<your-vercel-domain>.vercel.app`
4. Deploy and copy your backend URL (e.g. `https://salesmind-backend.onrender.com`).

---

### 3. Deploy Frontend to Vercel
1. In [Vercel](https://vercel.com), create a **New Project** and import the repository.
2. Configure project settings:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
3. Set Environment Variables:
   - `REACT_APP_BACKEND_URL`: `https://salesmind-backend.onrender.com`
4. Deploy!

---

## 💻 Local Development with Docker

To run the entire stack locally using Docker:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (Docs: http://localhost:8000/docs)
- **MongoDB**: localhost:27017

Default seeded admin login:
- **Email**: `govind.developer@kozker.com`
- **Password**: `SalesMind2026!`

---

## 📋 Environment Variables Reference

| Variable | Target | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | Backend | MongoDB Atlas / local connection URI |
| `MONGODB_DATABASE` | Backend | Database name (default: `salesmind`) |
| `PORT` | Backend | Dynamic server port (auto-set by Render/Railway) |
| `JWT_SECRET` | Backend | JWT signing secret |
| `COOKIE_SECURE` | Backend | Set to `true` in production for HTTPS SameSite=None cookies |
| `FRONTEND_URL` | Backend | Comma-separated list of allowed frontend domains for CORS |
| `REACT_APP_BACKEND_URL` | Frontend | Target backend API URL |
| `EMERGENT_LLM_KEY` | Backend | (Optional) Gemini API key for AI enrichment & chat |
| `EMERGENT_EMAIL_KEY` | Backend | (Optional) Resend email service key |

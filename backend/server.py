from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any, Dict

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, EmailStr, ConfigDict

from llm import llm_complete, llm_stream, extract_json, model_label

# ----------------------------------------------------------------------------
# Database
# ----------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("salesmind")

app = FastAPI(title="SalesMind API")
api = APIRouter(prefix="/api")

# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
def _to_str(v: Any) -> Any:
    if isinstance(v, ObjectId):
        return str(v)
    return v


PyObjectId = Annotated[str, BeforeValidator(_to_str)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, InvalidId):
        raise HTTPException(status_code=401, detail="Invalid token")


def is_manager(user: dict) -> bool:
    return user.get("role") in ("manager", "admin")


def record_scope(user: dict) -> dict:
    """Layer 2 (workspace) + Layer 3 (ownership) scope for records.
    Managers see everything in their workspace; reps see only what they own."""
    scope = {"workspace_id": user["workspace_id"]}
    if not is_manager(user):
        scope["owner_id"] = user["id"]
    return scope


async def log_audit(user: dict, action: str, target: str, detail: str, ai_model: Optional[str] = None):
    await db.audit_logs.insert_one({
        "workspace_id": user["workspace_id"],
        "actor_id": user["id"],
        "actor_name": user.get("name", ""),
        "action": action,
        "target": target,
        "detail": detail,
        "ai_model": ai_model,
        "created_at": now_iso(),
    })


# ----------------------------------------------------------------------------
# Default schema
# ----------------------------------------------------------------------------
DEAL_STAGES = ["Lead", "Contacted", "Proposal", "Won", "Lost"]

DEFAULT_FIELDS = {
    "contact": [
        {"key": "name", "label": "Name", "type": "text", "core": True},
        {"key": "email", "label": "Email", "type": "email", "core": True},
        {"key": "phone", "label": "Phone", "type": "text", "core": True},
        {"key": "company", "label": "Company", "type": "text", "core": True},
        {"key": "title", "label": "Title", "type": "text", "core": True},
        {"key": "status", "label": "Status", "type": "select", "core": True,
         "options": ["Lead", "Qualified", "Customer", "Churned"]},
    ],
    "company": [
        {"key": "name", "label": "Company", "type": "text", "core": True},
        {"key": "domain", "label": "Domain", "type": "text", "core": True},
        {"key": "industry", "label": "Industry", "type": "text", "core": True},
        {"key": "size", "label": "Employees", "type": "number", "core": True},
    ],
    "deal": [
        {"key": "title", "label": "Deal", "type": "text", "core": True},
        {"key": "value", "label": "Value", "type": "number", "core": True},
        {"key": "stage", "label": "Stage", "type": "select", "core": True, "options": DEAL_STAGES},
        {"key": "contact", "label": "Contact", "type": "text", "core": True},
    ],
}


async def seed_workspace(workspace_id: str):
    for object_type, fields in DEFAULT_FIELDS.items():
        for i, f in enumerate(fields):
            exists = await db.fields.find_one({"workspace_id": workspace_id,
                                               "object_type": object_type, "key": f["key"]})
            if not exists:
                await db.fields.insert_one({
                    "workspace_id": workspace_id,
                    "object_type": object_type,
                    "key": f["key"],
                    "label": f["label"],
                    "type": f["type"],
                    "options": f.get("options", []),
                    "core": f.get("core", False),
                    "ai_generated": False,
                    "ai_prompt": None,
                    "order": i,
                    "created_at": now_iso(),
                })


# ----------------------------------------------------------------------------
# Auth request models
# ----------------------------------------------------------------------------
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    workspace_name: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


async def _issue_session(response: Response, user_doc: dict):
    uid = str(user_doc["_id"])
    access = create_access_token(uid, user_doc["email"])
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)


def _public_user(user_doc: dict) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc["name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "workspace_id": user_doc["workspace_id"],
        "workspace_name": user_doc.get("workspace_name", ""),
    }


@api.post("/auth/register")
async def register(body: RegisterReq, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    ws_name = body.workspace_name or f"{body.name.split(' ')[0]}'s Workspace"
    ws = await db.workspaces.insert_one({"name": ws_name, "created_at": now_iso()})
    workspace_id = str(ws.inserted_id)
    doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "manager",
        "workspace_id": workspace_id,
        "workspace_name": ws_name,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    await seed_workspace(workspace_id)
    await _issue_session(response, doc)
    return _public_user(doc)


@api.post("/auth/login")
async def login(body: LoginReq, request: Request, response: Response):
    email = body.email.lower()
    ident = f"{request.client.host}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": ident})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = attempts.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1},
             "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    await _issue_session(response, user)
    return _public_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"], "name": user["name"], "email": user["email"],
        "role": user["role"], "workspace_id": user["workspace_id"],
        "workspace_name": user.get("workspace_name", ""),
    }


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True,
                            samesite="none", max_age=43200, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----------------------------------------------------------------------------
# Fields (dynamic schema)
# ----------------------------------------------------------------------------
class FieldCreate(BaseModel):
    object_type: str
    label: str
    type: str = "text"
    options: List[str] = []
    ai_generated: bool = False
    ai_prompt: Optional[str] = None


ALLOWED_FIELD_TYPES = {"text", "number", "email", "date", "select", "url", "boolean"}


def normalize_type(t: str) -> str:
    t = (t or "text").lower()
    if t in ("dropdown", "choice", "enum", "option"):
        return "select"
    if t in ("integer", "float", "currency", "money"):
        return "number"
    return t if t in ALLOWED_FIELD_TYPES else "text"


def slugify(label: str) -> str:
    base = "".join(c if c.isalnum() else "_" for c in label.lower()).strip("_")
    return base or f"field_{secrets.token_hex(3)}"


@api.get("/fields")
async def list_fields(object_type: str, user: dict = Depends(get_current_user)):
    cur = db.fields.find({"workspace_id": user["workspace_id"], "object_type": object_type}).sort("order", 1)
    out = []
    async for f in cur:
        f["id"] = str(f["_id"])
        f.pop("_id", None)
        out.append(f)
    return out


@api.post("/fields")
async def create_field(body: FieldCreate, user: dict = Depends(get_current_user)):
    key = slugify(body.label)
    exists = await db.fields.find_one({"workspace_id": user["workspace_id"],
                                       "object_type": body.object_type, "key": key})
    if exists:
        key = f"{key}_{secrets.token_hex(2)}"
    count = await db.fields.count_documents({"workspace_id": user["workspace_id"],
                                             "object_type": body.object_type})
    doc = {
        "workspace_id": user["workspace_id"],
        "object_type": body.object_type,
        "key": key,
        "label": body.label,
        "type": normalize_type(body.type),
        "options": body.options,
        "core": False,
        "ai_generated": body.ai_generated,
        "ai_prompt": body.ai_prompt,
        "order": count,
        "created_at": now_iso(),
    }
    res = await db.fields.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    await log_audit(user, "field.create",
                    f"{body.object_type}.{key}",
                    f"Created {'AI ' if body.ai_generated else ''}field '{body.label}' ({body.type})")
    return doc


@api.delete("/fields/{field_id}")
async def delete_field(field_id: str, user: dict = Depends(get_current_user)):
    f = await db.fields.find_one({"_id": ObjectId(field_id), "workspace_id": user["workspace_id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Field not found")
    if f.get("core"):
        raise HTTPException(status_code=400, detail="Cannot delete a core field")
    await db.fields.delete_one({"_id": ObjectId(field_id)})
    await log_audit(user, "field.delete", f"{f['object_type']}.{f['key']}", f"Deleted field '{f['label']}'")
    return {"ok": True}


class AIBuildReq(BaseModel):
    object_type: str
    prompt: str


@api.post("/fields/ai-build")
async def ai_build_fields(body: AIBuildReq, user: dict = Depends(get_current_user)):
    system = (
        "You are a CRM schema designer. Given a plain-English request, output the custom fields to create. "
        "Return ONLY JSON: an array of objects, each {\"label\": str, \"type\": one of "
        "[text,number,email,date,select,url,boolean], \"options\": [str] (only for select else []), "
        "\"reason\": short str}. Keep labels concise. Max 4 fields."
    )
    prompt = f"Object type: {body.object_type}\nRequest: {body.prompt}\nDesign the fields."
    raw = await llm_complete("field_builder", system, prompt, session_id=f"fb-{user['id']}")
    try:
        fields = extract_json(raw)
        if isinstance(fields, dict):
            fields = fields.get("fields", [fields])
    except Exception as e:
        logger.error(f"ai-build parse error: {e} :: {raw[:300]}")
        raise HTTPException(status_code=502, detail="AI could not design fields. Try rephrasing.")
    clean = []
    for f in fields[:4]:
        clean.append({
            "label": str(f.get("label", "Field")),
            "type": normalize_type(f.get("type", "text")),
            "options": f.get("options", []) or [],
            "reason": f.get("reason", ""),
        })
    return {"fields": clean, "model": model_label("field_builder")}


@api.post("/fields/ai-suggest")
async def ai_suggest_fields(body: AIBuildReq, user: dict = Depends(get_current_user)):
    existing = await db.fields.find({"workspace_id": user["workspace_id"],
                                     "object_type": body.object_type}).to_list(100)
    labels = [f["label"] for f in existing]
    system = (
        "You are a CRM analyst. Suggest useful NEW custom fields a sales team should track for this object, "
        "excluding ones that already exist. Return ONLY JSON array of {\"label\":str,\"type\":str,"
        "\"reason\":short str}. Max 4."
    )
    prompt = f"Object: {body.object_type}\nExisting fields: {labels}\nSuggest new fields."
    raw = await llm_complete("suggest", system, prompt, session_id=f"sg-{user['id']}")
    try:
        fields = extract_json(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="AI could not generate suggestions.")
    return {"fields": fields[:4], "model": model_label("suggest")}


# ----------------------------------------------------------------------------
# Records (contacts / companies / deals)
# ----------------------------------------------------------------------------
class RecordCreate(BaseModel):
    object_type: str
    data: Dict[str, Any] = {}


class RecordUpdate(BaseModel):
    data: Dict[str, Any]


def _serialize_record(r: dict) -> dict:
    r["id"] = str(r["_id"])
    r.pop("_id", None)
    return r


@api.get("/records")
async def list_records(object_type: str, user: dict = Depends(get_current_user)):
    scope = record_scope(user)
    scope["object_type"] = object_type
    cur = db.records.find(scope).sort("created_at", -1)
    out = []
    async for r in cur:
        out.append(_serialize_record(r))
    return out


@api.post("/records")
async def create_record(body: RecordCreate, user: dict = Depends(get_current_user)):
    doc = {
        "workspace_id": user["workspace_id"],
        "owner_id": user["id"],
        "owner_name": user["name"],
        "object_type": body.object_type,
        "data": body.data,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    res = await db.records.insert_one(doc)
    rid = str(res.inserted_id)
    name = body.data.get("name") or body.data.get("title") or "record"
    await db.activities.insert_one({
        "workspace_id": user["workspace_id"], "record_id": rid, "type": "created",
        "content": f"{user['name']} created this {body.object_type}", "created_at": now_iso(),
    })
    await log_audit(user, "record.create", f"{body.object_type}:{rid}", f"Created {body.object_type} '{name}'")
    doc["id"] = rid
    doc.pop("_id", None)
    return doc


async def _get_owned_record(record_id: str, user: dict) -> dict:
    try:
        r = await db.records.find_one({"_id": ObjectId(record_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="Not found")
    if not r or r["workspace_id"] != user["workspace_id"]:
        raise HTTPException(status_code=404, detail="Not found")
    if not is_manager(user) and r["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Not found")
    return r


@api.get("/records/{record_id}")
async def get_record(record_id: str, user: dict = Depends(get_current_user)):
    r = await _get_owned_record(record_id, user)
    return _serialize_record(r)


@api.put("/records/{record_id}")
async def update_record(record_id: str, body: RecordUpdate, user: dict = Depends(get_current_user)):
    r = await _get_owned_record(record_id, user)
    old_stage = r["data"].get("stage")
    await db.records.update_one({"_id": r["_id"]},
                                {"$set": {"data": body.data, "updated_at": now_iso()}})
    new_stage = body.data.get("stage")
    if r["object_type"] == "deal" and new_stage and new_stage != old_stage:
        await db.activities.insert_one({
            "workspace_id": user["workspace_id"], "record_id": record_id, "type": "stage",
            "content": f"Stage moved {old_stage or '—'} → {new_stage}", "created_at": now_iso(),
        })
    await log_audit(user, "record.update", f"{r['object_type']}:{record_id}", "Updated record")
    r["data"] = body.data
    return _serialize_record(r)


@api.delete("/records/{record_id}")
async def delete_record(record_id: str, user: dict = Depends(get_current_user)):
    r = await _get_owned_record(record_id, user)
    await db.records.delete_one({"_id": r["_id"]})
    await db.activities.delete_many({"record_id": record_id})
    await log_audit(user, "record.delete", f"{r['object_type']}:{record_id}", "Deleted record")
    return {"ok": True}


class EnrichReq(BaseModel):
    field_key: str


@api.post("/records/{record_id}/enrich")
async def enrich_record(record_id: str, body: EnrichReq, user: dict = Depends(get_current_user)):
    r = await _get_owned_record(record_id, user)
    field = await db.fields.find_one({"workspace_id": user["workspace_id"],
                                      "object_type": r["object_type"], "key": body.field_key})
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    context = {k: v for k, v in r["data"].items() if v}
    instruction = field.get("ai_prompt") or f"Determine the value for '{field['label']}'."
    system = (
        "You are a research/enrichment agent for a CRM (Claygent-style). Using the known record context, "
        "infer the most likely structured value for the requested field. Respond with ONLY the value "
        "(no preamble, no quotes). For select fields choose exactly one of the allowed options. "
        "If genuinely unknown, respond exactly: UNKNOWN."
    )
    opts = f"\nAllowed options: {field['options']}" if field.get("type") == "select" and field.get("options") else ""
    prompt = (f"Object type: {r['object_type']}\nRecord context: {context}\n"
              f"Field to fill: {field['label']} (type: {field['type']}){opts}\nInstruction: {instruction}")
    raw = (await llm_complete("enrich", system, prompt, session_id=f"en-{record_id}")).strip()
    value = raw.split("\n")[0].strip().strip('"')
    if value.upper() == "UNKNOWN":
        value = ""
    new_data = dict(r["data"])
    new_data[body.field_key] = value
    await db.records.update_one({"_id": r["_id"]}, {"$set": {"data": new_data, "updated_at": now_iso()}})
    await db.activities.insert_one({
        "workspace_id": user["workspace_id"], "record_id": record_id, "type": "ai",
        "content": f"AI enriched '{field['label']}' → {value or '—'}", "created_at": now_iso(),
    })
    await log_audit(user, "record.enrich", f"{r['object_type']}:{record_id}",
                    f"AI filled '{field['label']}' = {value or '—'}", ai_model=model_label("enrich"))
    return {"field_key": body.field_key, "value": value, "model": model_label("enrich")}


# ----------------------------------------------------------------------------
# Activities
# ----------------------------------------------------------------------------
class ActivityCreate(BaseModel):
    record_id: str
    type: str = "note"
    content: str


@api.get("/records/{record_id}/activities")
async def list_activities(record_id: str, user: dict = Depends(get_current_user)):
    await _get_owned_record(record_id, user)
    cur = db.activities.find({"record_id": record_id}).sort("created_at", -1)
    out = []
    async for a in cur:
        a["id"] = str(a["_id"])
        a.pop("_id", None)
        out.append(a)
    return out


@api.post("/activities")
async def add_activity(body: ActivityCreate, user: dict = Depends(get_current_user)):
    await _get_owned_record(body.record_id, user)
    doc = {"workspace_id": user["workspace_id"], "record_id": body.record_id,
           "type": body.type, "content": body.content, "actor": user["name"], "created_at": now_iso()}
    res = await db.activities.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api.get("/timeline")
async def workspace_timeline(user: dict = Depends(get_current_user)):
    scope = record_scope(user)
    ids = [str(r["_id"]) async for r in db.records.find(scope, {"_id": 1})]
    cur = db.activities.find({"record_id": {"$in": ids}}).sort("created_at", -1).limit(30)
    out = []
    async for a in cur:
        a["id"] = str(a["_id"])
        a.pop("_id", None)
        out.append(a)
    return out


# ----------------------------------------------------------------------------
# Stats
# ----------------------------------------------------------------------------
@api.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    scope = record_scope(user)
    contacts = await db.records.count_documents({**scope, "object_type": "contact"})
    companies = await db.records.count_documents({**scope, "object_type": "company"})
    deals_cur = db.records.find({**scope, "object_type": "deal"})
    pipeline = 0.0
    won = 0.0
    stage_counts = {s: 0 for s in DEAL_STAGES}
    deal_count = 0
    async for d in deals_cur:
        deal_count += 1
        val = d["data"].get("value") or 0
        try:
            val = float(val)
        except (TypeError, ValueError):
            val = 0
        stg = d["data"].get("stage", "Lead")
        stage_counts[stg] = stage_counts.get(stg, 0) + 1
        if stg == "Won":
            won += val
        elif stg != "Lost":
            pipeline += val
    ai_fields = await db.fields.count_documents({"workspace_id": user["workspace_id"], "ai_generated": True})
    return {
        "contacts": contacts, "companies": companies, "deals": deal_count,
        "pipeline_value": pipeline, "won_value": won,
        "stage_counts": stage_counts, "ai_fields": ai_fields,
    }


# ----------------------------------------------------------------------------
# AI Chat — "Ask your pipeline anything"
# ----------------------------------------------------------------------------
class ChatReq(BaseModel):
    message: str


async def _pipeline_context(user: dict) -> str:
    scope = record_scope(user)
    lines = []
    for ot in ("deal", "contact", "company"):
        recs = await db.records.find({**scope, "object_type": ot}).limit(40).to_list(40)
        if not recs:
            continue
        lines.append(f"\n## {ot.upper()}S ({len(recs)})")
        for r in recs:
            d = r["data"]
            summary = ", ".join(f"{k}={v}" for k, v in d.items() if v)
            lines.append(f"- {summary}")
    return "\n".join(lines) or "No records yet."


@api.post("/chat")
async def chat(body: ChatReq, user: dict = Depends(get_current_user)):
    context = await _pipeline_context(user)
    system = (
        "You are SalesMind, an AI sales analyst embedded in a CRM. Answer questions about the user's pipeline "
        "using ONLY the data provided. Be matter-of-fact, numbers-first, and concise. Format money with $ and "
        "commas. When asked for actions that would change data (create/update/delete), do NOT perform them — "
        "instead describe the exact change and note it requires human approval. Use short paragraphs or tight lists."
    )
    prompt = f"CRM DATA (workspace: {user.get('workspace_name','')}):\n{context}\n\nUSER QUESTION: {body.message}"

    await log_audit(user, "chat.query", "pipeline", body.message[:120], ai_model=model_label("chat"))

    async def gen():
        async for chunk in llm_stream("chat", system, prompt, session_id=f"chat-{user['id']}"):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ----------------------------------------------------------------------------
# Audit log
# ----------------------------------------------------------------------------
@api.get("/audit")
async def audit(user: dict = Depends(get_current_user)):
    q = {"workspace_id": user["workspace_id"]}
    if not is_manager(user):
        q["actor_id"] = user["id"]
    cur = db.audit_logs.find(q).sort("created_at", -1).limit(100)
    out = []
    async for a in cur:
        a["id"] = str(a["_id"])
        a.pop("_id", None)
        out.append(a)
    return out


@api.get("/")
async def root():
    return {"service": "SalesMind API", "status": "ok"}


# ----------------------------------------------------------------------------
# Startup
# ----------------------------------------------------------------------------
DEMO_CONTACTS = [
    {"name": "Marcus Bellamy", "email": "marcus@northwind.io", "phone": "+1 415 555 0142",
     "company": "Northwind Labs", "title": "VP Sales", "status": "Qualified"},
    {"name": "Priya Nair", "email": "priya@aperturelabs.com", "phone": "+1 628 555 0199",
     "company": "Aperture Labs", "title": "Head of Growth", "status": "Lead"},
    {"name": "Diego Santos", "email": "diego@meridian.co", "phone": "+1 917 555 0110",
     "company": "Meridian", "title": "Founder", "status": "Customer"},
    {"name": "Hannah Cole", "email": "hannah@vertexpay.com", "phone": "+44 20 7946 0958",
     "company": "VertexPay", "title": "COO", "status": "Qualified"},
]
DEMO_COMPANIES = [
    {"name": "Northwind Labs", "domain": "northwind.io", "industry": "DevTools", "size": 45},
    {"name": "Aperture Labs", "domain": "aperturelabs.com", "industry": "AI", "size": 120},
    {"name": "Meridian", "domain": "meridian.co", "industry": "Fintech", "size": 18},
]
DEMO_DEALS = [
    {"title": "Northwind — Team plan", "value": 24000, "stage": "Proposal", "contact": "Marcus Bellamy"},
    {"title": "Aperture — Pilot", "value": 8000, "stage": "Contacted", "contact": "Priya Nair"},
    {"title": "Meridian — Renewal", "value": 36000, "stage": "Won", "contact": "Diego Santos"},
    {"title": "VertexPay — Expansion", "value": 52000, "stage": "Lead", "contact": "Hannah Cole"},
    {"title": "Northwind — Add-on", "value": 12000, "stage": "Lost", "contact": "Marcus Bellamy"},
]


async def seed_demo_records(user_id: str, user_name: str, workspace_id: str):
    if await db.records.count_documents({"workspace_id": workspace_id}) > 0:
        return
    base = {"workspace_id": workspace_id, "owner_id": user_id, "owner_name": user_name}
    for c in DEMO_CONTACTS:
        await db.records.insert_one({**base, "object_type": "contact", "data": c,
                                     "created_at": now_iso(), "updated_at": now_iso()})
    for c in DEMO_COMPANIES:
        await db.records.insert_one({**base, "object_type": "company", "data": c,
                                     "created_at": now_iso(), "updated_at": now_iso()})
    for d in DEMO_DEALS:
        res = await db.records.insert_one({**base, "object_type": "deal", "data": d,
                                           "created_at": now_iso(), "updated_at": now_iso()})
        await db.activities.insert_one({"workspace_id": workspace_id, "record_id": str(res.inserted_id),
                                        "type": "created", "content": f"{user_name} created this deal",
                                        "created_at": now_iso()})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.fields.create_index([("workspace_id", 1), ("object_type", 1)])
    await db.records.create_index([("workspace_id", 1), ("object_type", 1)])
    await db.audit_logs.create_index([("workspace_id", 1)])

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        ws = await db.workspaces.insert_one({"name": "Kozker Sales", "created_at": now_iso()})
        workspace_id = str(ws.inserted_id)
        doc = {
            "name": "Govind", "email": admin_email, "password_hash": hash_password(admin_password),
            "role": "manager", "workspace_id": workspace_id, "workspace_name": "Kozker Sales",
            "created_at": now_iso(),
        }
        res = await db.users.insert_one(doc)
        await seed_workspace(workspace_id)
        await seed_demo_records(str(res.inserted_id), "Govind", workspace_id)
        logger.info("Seeded admin + demo workspace")
    else:
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one({"email": admin_email},
                                      {"$set": {"password_hash": hash_password(admin_password)}})
        await seed_workspace(existing["workspace_id"])
        await seed_demo_records(str(existing["_id"]), existing["name"], existing["workspace_id"])


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

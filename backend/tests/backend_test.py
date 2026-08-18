"""SalesMind backend API tests - auth, fields, records, AI, RBAC/tenant isolation."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salesmind-crm.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "govind.developer@kozker.com"
ADMIN_PASSWORD = "SalesMind2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] in ("manager", "admin")
    return s


@pytest.fixture(scope="session")
def new_user():
    """Register a brand-new user in their own workspace for tenant-isolation tests."""
    s = requests.Session()
    email = f"TEST_iso_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register",
               json={"name": "Iso Tester", "email": email, "password": "Passw0rd!123",
                     "workspace_name": "TEST_iso_ws"},
               timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"session": s, "user": data, "email": email}


# ---------- Auth ----------
class TestAuth:
    def test_health(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_admin_login_ok(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["workspace_id"]

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong_password"}, timeout=15)
        assert r.status_code in (401, 429)

    def test_me_unauthed(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Stats & seeded data ----------
class TestStats:
    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["contacts"] == 4
        assert d["companies"] == 3
        assert d["deals"] == 5
        # $24k Proposal + $8k Contacted + $52k Lead = 84k open pipeline
        assert d["pipeline_value"] == 84000
        assert d["won_value"] == 36000
        assert d["stage_counts"]["Won"] == 1
        assert d["stage_counts"]["Lost"] == 1


# ---------- Fields ----------
class TestFields:
    def test_list_default_fields(self, admin_session):
        r = admin_session.get(f"{API}/fields", params={"object_type": "contact"}, timeout=15)
        assert r.status_code == 200
        fields = r.json()
        keys = {f["key"] for f in fields}
        assert {"name", "email", "phone", "company", "title", "status"}.issubset(keys)

    def test_create_and_delete_field(self, admin_session):
        r = admin_session.post(f"{API}/fields",
                               json={"object_type": "contact", "label": "TEST_field_x", "type": "text"},
                               timeout=15)
        assert r.status_code == 200
        fid = r.json()["id"]
        # confirm listed
        r2 = admin_session.get(f"{API}/fields", params={"object_type": "contact"}, timeout=15)
        assert any(f["id"] == fid for f in r2.json())
        # delete
        r3 = admin_session.delete(f"{API}/fields/{fid}", timeout=15)
        assert r3.status_code == 200

    def test_cannot_delete_core_field(self, admin_session):
        r = admin_session.get(f"{API}/fields", params={"object_type": "contact"}, timeout=15)
        name_field = next(f for f in r.json() if f["key"] == "name")
        r2 = admin_session.delete(f"{API}/fields/{name_field['id']}", timeout=15)
        assert r2.status_code == 400


# ---------- Records ----------
class TestRecords:
    def test_list_contacts(self, admin_session):
        r = admin_session.get(f"{API}/records", params={"object_type": "contact"}, timeout=15)
        assert r.status_code == 200
        recs = r.json()
        assert len(recs) == 4
        names = {rec["data"]["name"] for rec in recs}
        assert "Marcus Bellamy" in names

    def test_create_update_delete_record(self, admin_session):
        payload = {"object_type": "contact",
                   "data": {"name": "TEST_Contact", "email": "test@test.io", "company": "TEST"}}
        r = admin_session.post(f"{API}/records", json=payload, timeout=15)
        assert r.status_code == 200
        rid = r.json()["id"]
        # GET
        r2 = admin_session.get(f"{API}/records/{rid}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["data"]["name"] == "TEST_Contact"
        # UPDATE
        r3 = admin_session.put(f"{API}/records/{rid}",
                               json={"data": {"name": "TEST_Contact", "email": "test@test.io",
                                              "company": "TEST", "title": "CTO"}},
                               timeout=15)
        assert r3.status_code == 200
        assert r3.json()["data"]["title"] == "CTO"
        # DELETE
        r4 = admin_session.delete(f"{API}/records/{rid}", timeout=15)
        assert r4.status_code == 200
        r5 = admin_session.get(f"{API}/records/{rid}", timeout=15)
        assert r5.status_code == 404


# ---------- RBAC / tenant isolation ----------
class TestIsolation:
    def test_new_workspace_has_no_demo_records(self, new_user):
        s = new_user["session"]
        r = s.get(f"{API}/records", params={"object_type": "contact"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == []
        r2 = s.get(f"{API}/stats", timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        assert d["contacts"] == 0 and d["deals"] == 0

    def test_new_workspace_has_seeded_fields(self, new_user):
        s = new_user["session"]
        r = s.get(f"{API}/fields", params={"object_type": "contact"}, timeout=15)
        assert r.status_code == 200
        keys = {f["key"] for f in r.json()}
        assert "name" in keys and "email" in keys

    def test_cross_tenant_record_404(self, admin_session, new_user):
        # admin creates a record; new_user tries to fetch it -> 404
        r = admin_session.post(f"{API}/records",
                               json={"object_type": "contact",
                                     "data": {"name": "TEST_cross"}}, timeout=15)
        rid = r.json()["id"]
        r2 = new_user["session"].get(f"{API}/records/{rid}", timeout=15)
        assert r2.status_code == 404
        admin_session.delete(f"{API}/records/{rid}", timeout=15)


# ---------- AI endpoints ----------
class TestAI:
    def test_ai_field_builder(self, admin_session):
        r = admin_session.post(f"{API}/fields/ai-build",
                               json={"object_type": "contact",
                                     "prompt": "track renewal date and plan tier"},
                               timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "fields" in d and len(d["fields"]) >= 1
        for f in d["fields"]:
            assert "label" in f and "type" in f

    def test_ai_suggest(self, admin_session):
        r = admin_session.post(f"{API}/fields/ai-suggest",
                               json={"object_type": "contact", "prompt": ""},
                               timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "fields" in d

    def test_ai_enrich(self, admin_session):
        # create AI field
        r = admin_session.post(f"{API}/fields",
                               json={"object_type": "contact", "label": "TEST_ai_country",
                                     "type": "text", "ai_generated": True,
                                     "ai_prompt": "Infer the country of this person."},
                               timeout=15)
        assert r.status_code == 200
        field = r.json()
        # pick an existing contact
        recs = admin_session.get(f"{API}/records", params={"object_type": "contact"}, timeout=15).json()
        rid = recs[0]["id"]
        r2 = admin_session.post(f"{API}/records/{rid}/enrich",
                                json={"field_key": field["key"]}, timeout=60)
        assert r2.status_code == 200, r2.text
        assert "value" in r2.json()
        admin_session.delete(f"{API}/fields/{field['id']}", timeout=15)

    def test_chat_streaming(self, admin_session):
        # streaming plain text
        with admin_session.post(f"{API}/chat",
                                json={"message": "How many deals are open?"},
                                stream=True, timeout=60) as r:
            assert r.status_code == 200
            body = b""
            for chunk in r.iter_content(chunk_size=None):
                body += chunk
                if len(body) > 200:
                    break
            assert len(body) > 0


# ---------- Audit ----------
class TestAudit:
    def test_audit_log_contains_ai_events(self, admin_session):
        r = admin_session.get(f"{API}/audit", timeout=15)
        assert r.status_code == 200
        events = r.json()
        actions = {e["action"] for e in events}
        # After prior AI tests we should have at least chat.query and field.create
        assert "chat.query" in actions or "field.create" in actions

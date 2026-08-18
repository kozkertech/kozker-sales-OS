"""SalesMind iteration_2 backend tests:
Lead scoring, AI Agent Actions (approval), Sequences + enrollment + AI draft,
Message approval (Resend real email / WhatsApp mock), Team Invites + RBAC after accept.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salesmind-crm.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "govind.developer@kozker.com"
ADMIN_PASSWORD = "SalesMind2026!"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def deals(admin):
    r = admin.get(f"{API}/records", params={"object_type": "deal"}, timeout=15)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def contacts(admin):
    r = admin.get(f"{API}/records", params={"object_type": "contact"}, timeout=15)
    assert r.status_code == 200
    return r.json()


# -------- Lead scoring --------
class TestLeadScoring:
    def test_score_single_deal(self, admin, deals):
        open_deal = next(d for d in deals if d["data"].get("stage") not in ("Won", "Lost"))
        r = admin.post(f"{API}/records/{open_deal['id']}/score", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert 0 <= d["score"] <= 100
        assert isinstance(d["next_action"], str) and len(d["next_action"]) > 0
        # persistence check
        g = admin.get(f"{API}/records/{open_deal['id']}", timeout=15).json()
        assert g["data"].get("_score") == d["score"]
        assert g["data"].get("_next_action") == d["next_action"]

    def test_score_all_deals(self, admin):
        r = admin.post(f"{API}/deals/score-all", timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["scored"] >= 1
        # verify at least one open deal has _score
        r2 = admin.get(f"{API}/records", params={"object_type": "deal"}, timeout=15)
        deals = r2.json()
        open_scored = [x for x in deals
                       if x["data"].get("stage") not in ("Won", "Lost")
                       and "_score" in x["data"]]
        assert len(open_scored) >= 1


# -------- AI Agent Actions with approval --------
class TestAgentActions:
    def test_plan_and_approve_update_deal(self, admin, deals):
        # Pick a Lead deal to move to Contacted
        lead_deal = next((d for d in deals if d["data"].get("stage") == "Lead"), None)
        if not lead_deal:
            lead_deal = next(d for d in deals if d["data"].get("stage") not in ("Won", "Lost"))
        target_title = lead_deal["data"]["title"]
        r = admin.post(f"{API}/agent/plan",
                       json={"message": f"Move the deal '{target_title}' to Contacted stage"},
                       timeout=60)
        assert r.status_code == 200, r.text
        actions = r.json()["actions"]
        assert len(actions) >= 1
        # find an update_deal action
        upd = next((a for a in actions if a["type"] == "update_deal"), None)
        assert upd is not None, f"no update_deal in {actions}"
        assert upd["status"] == "pending"
        # approve
        r2 = admin.post(f"{API}/agent/actions/{upd['id']}/approve", timeout=30)
        assert r2.status_code == 200, r2.text
        # verify DB change: fetch that deal
        rid = upd["params"]["record_id"]
        g = admin.get(f"{API}/records/{rid}", timeout=15).json()
        assert g["data"]["stage"] == upd["params"]["stage"]

    def test_plan_create_task_and_reject(self, admin):
        r = admin.post(f"{API}/agent/plan",
                       json={"message": "Create a follow-up task next week for Marcus Bellamy"},
                       timeout=60)
        assert r.status_code == 200
        actions = r.json()["actions"]
        task_action = next((a for a in actions if a["type"] == "create_task"), None)
        if task_action:
            rej = admin.post(f"{API}/agent/actions/{task_action['id']}/reject", timeout=15)
            assert rej.status_code == 200

    def test_list_pending_actions(self, admin):
        r = admin.get(f"{API}/agent/actions", timeout=15)
        assert r.status_code == 200
        for a in r.json():
            assert a["status"] == "pending"


# -------- Sequences CRUD --------
class TestSequences:
    _seq_id = None

    def test_create_sequence(self, admin):
        payload = {
            "name": f"TEST_seq_{uuid.uuid4().hex[:6]}",
            "trigger_type": "manual",
            "trigger_config": {},
            "autonomy": "approval",
            "steps": [
                {"channel": "email", "delay_days": 0, "subject": "TEST subject",
                 "ai_prompt": "friendly first outreach"},
                {"channel": "whatsapp", "delay_days": 2, "subject": None,
                 "ai_prompt": "gentle nudge"},
            ],
        }
        r = admin.post(f"{API}/sequences", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == payload["name"]
        assert d["autonomy"] == "approval"
        assert len(d["steps"]) == 2
        assert d["status"] == "active"
        TestSequences._seq_id = d["id"]

    def test_list_sequences(self, admin):
        r = admin.get(f"{API}/sequences", timeout=15)
        assert r.status_code == 200
        assert any(s["id"] == TestSequences._seq_id for s in r.json())

    def test_toggle_sequence(self, admin):
        r = admin.put(f"{API}/sequences/{TestSequences._seq_id}/toggle", timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "paused"
        r2 = admin.put(f"{API}/sequences/{TestSequences._seq_id}/toggle", timeout=15)
        assert r2.json()["status"] == "active"


# -------- Sequence enroll + AI draft + Message approval (REAL email via Resend) --------
class TestEnrollAndApprove:
    _email_msg_id = None
    _wa_msg_id = None
    _seq_email_id = None
    _seq_wa_id = None

    def test_enroll_creates_email_pending(self, admin, contacts):
        # create email-only sequence
        payload = {
            "name": f"TEST_seq_email_{uuid.uuid4().hex[:6]}",
            "autonomy": "approval",
            "steps": [{"channel": "email", "delay_days": 0,
                       "subject": "Following up", "ai_prompt": "quick intro"}],
        }
        r = admin.post(f"{API}/sequences", json=payload, timeout=15)
        assert r.status_code == 200
        TestEnrollAndApprove._seq_email_id = r.json()["id"]

        contact = contacts[0]
        r2 = admin.post(f"{API}/sequences/{TestEnrollAndApprove._seq_email_id}/enroll",
                        json={"contact_record_id": contact["id"]}, timeout=60)
        assert r2.status_code == 200, r2.text
        msg = r2.json()
        assert msg["status"] == "pending"
        assert msg["channel"] == "email"
        assert msg["to"] and "@" in msg["to"]
        assert len(msg["body"]) > 10
        TestEnrollAndApprove._email_msg_id = msg["id"]

    def test_pending_messages_list(self, admin):
        r = admin.get(f"{API}/messages/pending", timeout=15)
        assert r.status_code == 200
        assert any(m["id"] == TestEnrollAndApprove._email_msg_id for m in r.json())

    def test_approve_and_send_real_email(self, admin):
        r = admin.post(f"{API}/messages/{TestEnrollAndApprove._email_msg_id}/approve",
                       json={"subject": "TEST — approved subject", "body": "This is a TEST email body."},
                       timeout=60)
        assert r.status_code == 200, r.text
        assert "Resend" in r.json()["delivery"]

    def test_enroll_whatsapp_and_simulated_send(self, admin, contacts):
        payload = {
            "name": f"TEST_seq_wa_{uuid.uuid4().hex[:6]}",
            "autonomy": "approval",
            "steps": [{"channel": "whatsapp", "delay_days": 0,
                       "subject": None, "ai_prompt": "friendly whatsapp nudge"}],
        }
        r = admin.post(f"{API}/sequences", json=payload, timeout=15)
        TestEnrollAndApprove._seq_wa_id = r.json()["id"]
        contact = contacts[0]
        r2 = admin.post(f"{API}/sequences/{TestEnrollAndApprove._seq_wa_id}/enroll",
                        json={"contact_record_id": contact["id"]}, timeout=60)
        assert r2.status_code == 200, r2.text
        msg = r2.json()
        assert msg["channel"] == "whatsapp"
        TestEnrollAndApprove._wa_msg_id = msg["id"]
        r3 = admin.post(f"{API}/messages/{TestEnrollAndApprove._wa_msg_id}/approve",
                        json={}, timeout=30)
        assert r3.status_code == 200, r3.text
        assert "simulated" in r3.json()["delivery"].lower()

    def test_reject_message(self, admin, contacts):
        payload = {
            "name": f"TEST_seq_rej_{uuid.uuid4().hex[:6]}",
            "autonomy": "approval",
            "steps": [{"channel": "email", "delay_days": 0,
                       "subject": "Rej", "ai_prompt": "x"}],
        }
        sid = admin.post(f"{API}/sequences", json=payload, timeout=15).json()["id"]
        rr = admin.post(f"{API}/sequences/{sid}/enroll",
                        json={"contact_record_id": contacts[0]["id"]}, timeout=60)
        mid = rr.json()["id"]
        r = admin.post(f"{API}/messages/{mid}/reject", timeout=15)
        assert r.status_code == 200
        admin.delete(f"{API}/sequences/{sid}", timeout=15)

    def test_cleanup_sequences(self, admin):
        for sid in (TestEnrollAndApprove._seq_email_id, TestEnrollAndApprove._seq_wa_id):
            if sid:
                admin.delete(f"{API}/sequences/{sid}", timeout=15)
        if TestSequences._seq_id:
            admin.delete(f"{API}/sequences/{TestSequences._seq_id}", timeout=15)


# -------- Team + Invites + RBAC after accept --------
class TestInvitesAndRBAC:
    _invite_id = None
    _accept_token = None
    _invite_email = None

    def test_team_manager_only(self, admin):
        r = admin.get(f"{API}/team", timeout=15)
        assert r.status_code == 200
        assert any(m["email"] == ADMIN_EMAIL for m in r.json())

    def test_create_invite_sends_real_email(self, admin):
        email = f"delivered+rep_{uuid.uuid4().hex[:6]}@resend.dev"
        TestInvitesAndRBAC._invite_email = email
        r = admin.post(f"{API}/invites",
                       json={"email": email, "role": "rep"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email_sent"] is True, f"email_sent should be True, got {d}"
        assert d["status"] == "pending"
        # accept_url contains a token
        token = d["accept_url"].split("token=")[-1]
        TestInvitesAndRBAC._accept_token = token
        TestInvitesAndRBAC._invite_id = d["id"]

    def test_list_invites(self, admin):
        r = admin.get(f"{API}/invites", timeout=15)
        assert r.status_code == 200
        assert any(i["id"] == TestInvitesAndRBAC._invite_id for i in r.json())

    def test_verify_invite(self):
        r = requests.get(f"{API}/invites/verify",
                         params={"token": TestInvitesAndRBAC._accept_token}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == TestInvitesAndRBAC._invite_email
        assert d["role"] == "rep"

    def test_verify_invite_bad_token(self):
        r = requests.get(f"{API}/invites/verify",
                         params={"token": "bogus_token_xxx"}, timeout=15)
        assert r.status_code == 404

    def test_accept_invite_creates_rep(self):
        s = requests.Session()
        r = s.post(f"{API}/invites/accept",
                   json={"token": TestInvitesAndRBAC._accept_token,
                         "name": "Test Rep", "password": "RepPass!2026"},
                   timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "rep"
        assert d["email"] == TestInvitesAndRBAC._invite_email
        # store rep session for RBAC checks
        TestInvitesAndRBAC._rep_session = s

    def test_rep_sees_no_manager_records(self):
        s = TestInvitesAndRBAC._rep_session
        r = s.get(f"{API}/records", params={"object_type": "deal"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == []  # rep owns nothing yet
        r2 = s.get(f"{API}/records", params={"object_type": "contact"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json() == []
        r3 = s.get(f"{API}/stats", timeout=15)
        assert r3.status_code == 200
        assert r3.json()["deals"] == 0

    def test_rep_cannot_access_team(self):
        s = TestInvitesAndRBAC._rep_session
        r = s.get(f"{API}/team", timeout=15)
        assert r.status_code == 403

    def test_rep_cannot_list_invites(self):
        s = TestInvitesAndRBAC._rep_session
        r = s.get(f"{API}/invites", timeout=15)
        assert r.status_code == 403

    def test_rep_messages_and_sequences_scoped(self):
        s = TestInvitesAndRBAC._rep_session
        # rep sees no pending messages from manager
        r = s.get(f"{API}/messages/pending", timeout=15)
        assert r.status_code == 200
        assert r.json() == []
        # sequences list — sequences are workspace-wide in this MVP but rep should still authenticate
        r2 = s.get(f"{API}/sequences", timeout=15)
        assert r2.status_code == 200

    def test_revoke_invite(self, admin):
        # create a fresh invite then revoke it
        email = f"delivered+revoke_{uuid.uuid4().hex[:6]}@resend.dev"
        r = admin.post(f"{API}/invites", json={"email": email, "role": "rep"}, timeout=30)
        inv_id = r.json()["id"]
        r2 = admin.delete(f"{API}/invites/{inv_id}", timeout=15)
        assert r2.status_code == 200

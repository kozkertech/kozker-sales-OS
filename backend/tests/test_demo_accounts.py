"""Tests for the new demo accounts + RBAC scoping (iteration 3)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")

DEMO_MGR = {"email": "demo@salesmind.app", "password": "Demo1234!"}
DEMO_REP = {"email": "rep@salesmind.app", "password": "Demo1234!"}
ADMIN = {"email": "govind.developer@kozker.com", "password": "SalesMind2026!"}


def _login(payload):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=15)
    return s, r


# -------- Demo manager login --------
class TestDemoManagerLogin:
    def test_login_success(self):
        s, r = _login(DEMO_MGR)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "manager"
        assert data["workspace_name"] == "Demo Workspace"
        # httpOnly cookie set
        assert "access_token" in s.cookies

    def test_me_endpoint(self):
        s, r = _login(DEMO_MGR)
        assert r.status_code == 200
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert me.status_code == 200
        assert me.json()["email"] == DEMO_MGR["email"]

    def test_manager_stats(self):
        s, _ = _login(DEMO_MGR)
        r = s.get(f"{BASE_URL}/api/stats", timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("contacts") == 4, d
        assert d.get("companies") == 3, d
        assert d.get("deals") == 5, d
        assert d.get("pipeline_value") == 84000, d

    def test_manager_can_list_records(self):
        s, _ = _login(DEMO_MGR)
        for obj in ("contact", "company", "deal"):
            r = s.get(f"{BASE_URL}/api/records", params={"object_type": obj}, timeout=10)
            assert r.status_code == 200, f"{obj}: {r.text}"

    def test_manager_can_access_team(self):
        s, _ = _login(DEMO_MGR)
        r = s.get(f"{BASE_URL}/api/team", timeout=10)
        assert r.status_code == 200, r.text

    def test_manager_can_access_invites(self):
        s, _ = _login(DEMO_MGR)
        r = s.get(f"{BASE_URL}/api/invites", timeout=10)
        assert r.status_code == 200, r.text


# -------- Demo rep login + RBAC scoping --------
class TestDemoRepRBAC:
    def test_login_success(self):
        s, r = _login(DEMO_REP)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "rep"
        assert data["workspace_name"] == "Demo Workspace"

    def test_rep_stats_scoped(self):
        s, _ = _login(DEMO_REP)
        r = s.get(f"{BASE_URL}/api/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("deals") == 2, d
        assert d.get("contacts") == 0, d
        assert d.get("companies") == 0, d

    def test_rep_sees_only_own_deals(self):
        s, _ = _login(DEMO_REP)
        r = s.get(f"{BASE_URL}/api/records", params={"object_type": "deal"}, timeout=10)
        assert r.status_code == 200
        deals = r.json()
        assert isinstance(deals, list)
        assert len(deals) == 2, f"rep should see 2 deals, got {len(deals)}"
        for d in deals:
            assert d.get("owner_name") == "Demo Rep", d

    def test_rep_forbidden_team(self):
        s, _ = _login(DEMO_REP)
        r = s.get(f"{BASE_URL}/api/team", timeout=10)
        assert r.status_code == 403, r.status_code

    def test_rep_forbidden_invites(self):
        s, _ = _login(DEMO_REP)
        r = s.get(f"{BASE_URL}/api/invites", timeout=10)
        assert r.status_code == 403, r.status_code


# -------- Cross-workspace isolation --------
class TestWorkspaceIsolation:
    def test_admin_workspace_not_demo(self):
        s, r = _login(ADMIN)
        if r.status_code != 200:
            pytest.skip("admin credentials unavailable")
        data = r.json()
        assert data["workspace_name"] != "Demo Workspace"

    def test_admin_records_not_leaked_to_demo(self):
        s_admin, r = _login(ADMIN)
        if r.status_code != 200:
            pytest.skip("admin credentials unavailable")
        admin_deals = s_admin.get(f"{BASE_URL}/api/records",
                                  params={"object_type": "deal"}, timeout=10).json()
        admin_ids = {d.get("id") for d in admin_deals}

        s_demo, _ = _login(DEMO_MGR)
        demo_deals = s_demo.get(f"{BASE_URL}/api/records",
                                params={"object_type": "deal"}, timeout=10).json()
        demo_ids = {d.get("id") for d in demo_deals}
        assert admin_ids.isdisjoint(demo_ids), "Cross-tenant deal leak"

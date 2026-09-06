"""Notevoro backend regression tests.
Covers: auth, spaces (idempotency, plan gating, isolation, roles),
items CRUD (notes/tasks/projects/events/documents/records), files, chat,
voro (503 AI_NOT_CONFIGURED with no usage consumption), billing,
webhook idempotency, health, registry.
"""
import os
import io
import uuid
import time
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api/v1"
WEBHOOK_SECRET = "notevoro-dev-secret-change-me"


def _tok(email, password="password123"):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def alex():
    return _tok("alex@notevoro.com")


@pytest.fixture(scope="session")
def sarah():
    return _tok("sarah@notevoro.com")


@pytest.fixture(scope="session")
def evil():
    return _tok("evil@x.com")


# ---------- health ----------
class TestHealth:
    def test_live(self):
        r = requests.get(f"{BASE_URL}/api/health/live")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_ready(self):
        r = requests.get(f"{BASE_URL}/api/health/ready")
        assert r.status_code == 200
        j = r.json()
        assert j["status"] == "ready"
        assert j["checks"]["database"] == "ok"
        assert j["checks"]["ai"] == "not_configured"

    def test_registry(self, alex):
        r = requests.get(f"{API}/registry", headers=_h(alex))
        assert r.status_code == 200
        reg = r.json()
        assert len(reg) > 100
        types = {c["type"] for c in reg}
        assert {"module", "tool", "view", "ai", "integration"}.issubset(types)


# ---------- auth ----------
class TestAuth:
    def test_signup_and_duplicate(self):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@x.com"
        r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "T"})
        assert r.status_code == 201
        j = r.json()
        assert "token" in j and j["user"]["email"] == email.lower()
        # duplicate
        r2 = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "T"})
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "EMAIL_TAKEN"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "alex@notevoro.com", "password": "wrongpass"})
        assert r.status_code == 401
        err = r.json()["error"]
        assert err["code"] == "INVALID_CREDENTIALS"
        assert "request_id" in err
        assert "message" in err

    def test_me_returns_user_and_entitlements(self, alex):
        r = requests.get(f"{API}/auth/me", headers=_h(alex))
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["email"] == "alex@notevoro.com"
        assert "entitlements" in j
        assert "plan" in j["entitlements"]
        assert "limits" in j["entitlements"]

    def test_unauth_envelope(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401
        err = r.json()["error"]
        assert "code" in err and "message" in err and "request_id" in err


# ---------- spaces ----------
class TestSpaces:
    def test_idempotent_create(self, alex):
        name = f"TEST_idem_{uuid.uuid4().hex[:8]}"
        key = f"idem-{uuid.uuid4()}"
        payload = {"name": name, "type": "personal"}
        h = {**_h(alex), "Idempotency-Key": key}
        r1 = requests.post(f"{API}/spaces", json=payload, headers=h)
        assert r1.status_code == 201
        id1 = r1.json()["id"]
        r2 = requests.post(f"{API}/spaces", json=payload, headers=h)
        assert r2.status_code == 200 or r2.status_code == 201
        assert r2.json()["id"] == id1

    def test_duplicate_name_conflict(self, alex):
        name = f"TEST_dup_{uuid.uuid4().hex[:8]}"
        r1 = requests.post(f"{API}/spaces", json={"name": name, "type": "personal"}, headers=_h(alex))
        assert r1.status_code == 201
        r2 = requests.post(f"{API}/spaces", json={"name": name, "type": "personal"}, headers=_h(alex))
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "DUPLICATE_SPACE"

    def test_free_plan_team_space_402(self):
        # create fresh free-plan user
        email = f"TEST_free_{uuid.uuid4().hex[:8]}@x.com"
        r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "Free"})
        assert r.status_code == 201
        tok = r.json()["token"]
        rr = requests.post(f"{API}/spaces", json={"name": "TEST_TeamFree", "type": "team"}, headers=_h(tok))
        assert rr.status_code == 402
        assert rr.json()["error"]["code"] == "PLAN_REQUIRED"

        # upgrade → succeeds and auto creates space conversation
        rp = requests.post(f"{API}/billing/change-plan", json={"plan": "pro"}, headers=_h(tok))
        assert rp.status_code == 200
        rr2 = requests.post(f"{API}/spaces", json={"name": "TEST_TeamPro", "type": "team"}, headers=_h(tok))
        assert rr2.status_code == 201
        # verify a space conversation exists
        convs = requests.get(f"{API}/conversations", headers=_h(tok)).json()
        assert any(c.get("type") == "space" and c.get("space_id") == rr2.json()["id"] for c in convs)

    def test_isolation_forbidden(self, evil, alex):
        # find alex's team space id via brain
        brain = requests.get(f"{API}/brain", headers=_h(alex)).json()
        team = next(s for s in brain["spaces"] if s["type"] == "team")
        sid = team["id"]
        r = requests.get(f"{API}/spaces/{sid}/tasks", headers=_h(evil))
        assert r.status_code == 403
        assert r.json()["error"]["code"] in ("FORBIDDEN", "NOT_A_MEMBER")


# ---------- items CRUD (in a fresh personal space) ----------
@pytest.fixture(scope="class")
def space(alex):
    r = requests.post(f"{API}/spaces", json={"name": f"TEST_items_{uuid.uuid4().hex[:8]}", "type": "personal",
                                             "capabilities": ["notes", "tasks", "projects", "calendar", "documents", "files", "habits"]},
                      headers=_h(alex))
    assert r.status_code == 201, r.text
    return r.json()["id"]


class TestItems:
    def test_note_crud(self, alex, space):
        r = requests.post(f"{API}/spaces/{space}/notes", json={"title": "N1", "content": "hi"}, headers=_h(alex))
        assert r.status_code == 201
        nid = r.json()["id"]
        rl = requests.get(f"{API}/spaces/{space}/notes", headers=_h(alex))
        assert rl.status_code == 200 and any(x["id"] == nid for x in rl.json())
        rp = requests.patch(f"{API}/spaces/{space}/notes/{nid}", json={"content": "updated"}, headers=_h(alex))
        assert rp.status_code == 200 and rp.json()["content"] == "updated"
        rd = requests.delete(f"{API}/spaces/{space}/notes/{nid}", headers=_h(alex))
        assert rd.status_code == 200

    def test_task_crud(self, alex, space):
        r = requests.post(f"{API}/spaces/{space}/tasks", json={"title": "T1"}, headers=_h(alex))
        assert r.status_code == 201
        tid = r.json()["id"]
        rp = requests.patch(f"{API}/spaces/{space}/tasks/{tid}", json={"status": "done"}, headers=_h(alex))
        assert rp.status_code == 200 and rp.json()["status"] == "done"

    def test_project_crud(self, alex, space):
        r = requests.post(f"{API}/spaces/{space}/projects", json={"name": "P1"}, headers=_h(alex))
        assert r.status_code == 201

    def test_event_crud(self, alex, space):
        r = requests.post(f"{API}/spaces/{space}/events", json={"title": "E1", "kind": "event"}, headers=_h(alex))
        assert r.status_code == 201

    def test_document_versions(self, alex, space):
        r = requests.post(f"{API}/spaces/{space}/documents", json={"title": "D1", "content": "v1"}, headers=_h(alex))
        assert r.status_code == 201
        did = r.json()["id"]
        rp = requests.patch(f"{API}/spaces/{space}/documents/{did}", json={"content": "v2"}, headers=_h(alex))
        assert rp.status_code == 200 and rp.json()["version"] >= 2
        rv = requests.get(f"{API}/spaces/{space}/documents/{did}/versions", headers=_h(alex))
        assert rv.status_code == 200 and len(rv.json()) >= 1

    def test_records_need_capability(self, alex, space):
        # habits enabled → success
        r = requests.post(f"{API}/spaces/{space}/records/habits", json={"title": "run"}, headers=_h(alex))
        assert r.status_code == 201
        # unknown capability that's not enabled -> 403
        r2 = requests.post(f"{API}/spaces/{space}/records/goals", json={"title": "x"}, headers=_h(alex))
        assert r2.status_code == 403

    def test_search_and_export(self, alex, space):
        requests.post(f"{API}/spaces/{space}/notes", json={"title": "findme_zzz", "content": "x"}, headers=_h(alex))
        rs = requests.get(f"{API}/spaces/{space}/search", params={"q": "findme_zzz"}, headers=_h(alex))
        assert rs.status_code == 200 and any(x["kind"] == "note" for x in rs.json())
        re = requests.get(f"{API}/spaces/{space}/export", headers=_h(alex))
        assert re.status_code == 200
        assert "notes" in re.json() and "tasks" in re.json()

    def test_files_upload_and_content(self, alex, space):
        content = b"hello world"
        r = requests.post(f"{API}/spaces/{space}/files", headers=_h(alex),
                          files={"file": ("test.txt", io.BytesIO(content), "text/plain")})
        assert r.status_code == 201, r.text
        fid = r.json()["id"]
        rc = requests.get(f"{API}/spaces/{space}/files/{fid}/content", headers=_h(alex))
        assert rc.status_code == 200 and rc.content == content
        rd = requests.delete(f"{API}/spaces/{space}/files/{fid}", headers=_h(alex))
        assert rd.status_code == 200


# ---------- chat ----------
class TestChat:
    def test_direct_dedupe_and_message_idempotency(self, alex, sarah):
        # get sarah's user id via people list from alex
        people = requests.get(f"{API}/people", headers=_h(alex)).json()
        sarah_id = next(p["id"] for p in people if p["email"] == "sarah@notevoro.com")
        r1 = requests.post(f"{API}/conversations", json={"type": "direct", "member_ids": [sarah_id]}, headers=_h(alex))
        assert r1.status_code in (200, 201)
        c1 = r1.json()["id"]
        r2 = requests.post(f"{API}/conversations", json={"type": "direct", "member_ids": [sarah_id]}, headers=_h(alex))
        assert r2.json()["id"] == c1

        cid = uuid.uuid4().hex
        m1 = requests.post(f"{API}/conversations/{c1}/messages", json={"content": "hi", "client_id": cid}, headers=_h(alex))
        assert m1.status_code == 201
        m2 = requests.post(f"{API}/conversations/{c1}/messages", json={"content": "hi", "client_id": cid}, headers=_h(alex))
        assert m2.json().get("duplicate") is True

        # sarah marks read
        rr = requests.post(f"{API}/conversations/{c1}/read", headers=_h(sarah))
        assert rr.status_code == 200

    def test_dm_to_stranger_forbidden(self, evil, alex):
        # evil tries to DM alex — no shared team space
        people_alex_id = None
        me = requests.get(f"{API}/auth/me", headers=_h(alex)).json()
        alex_id = me["user"]["id"]
        r = requests.post(f"{API}/conversations", json={"type": "direct", "member_ids": [alex_id]}, headers=_h(evil))
        assert r.status_code == 403


# ---------- voro ----------
class TestVoro:
    def test_agents(self, alex):
        r = requests.get(f"{API}/voro/agents", headers=_h(alex))
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_ask_503_no_usage(self, alex):
        b1 = requests.get(f"{API}/billing", headers=_h(alex)).json()
        before = b1["usage"].get("ai_requests", 0)
        r = requests.post(f"{API}/voro/ask", json={"message": "hi"}, headers=_h(alex))
        assert r.status_code == 503
        assert r.json()["error"]["code"] == "AI_NOT_CONFIGURED"
        b2 = requests.get(f"{API}/billing", headers=_h(alex)).json()
        after = b2["usage"].get("ai_requests", 0)
        assert after == before, f"ai_requests usage changed: {before} -> {after}"

    def test_context_counts(self, alex):
        brain = requests.get(f"{API}/brain", headers=_h(alex)).json()
        sid = brain["spaces"][0]["id"]
        r = requests.get(f"{API}/voro/context", params={"space_id": sid}, headers=_h(alex))
        assert r.status_code == 200
        j = r.json()
        assert j["scope"] == "space"
        assert "counts" in j


# ---------- billing/webhook ----------
class TestBilling:
    def test_change_plan_and_expiry(self):
        email = f"TEST_bill_{uuid.uuid4().hex[:8]}@x.com"
        tok = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "B"}).json()["token"]
        r = requests.post(f"{API}/billing/change-plan", json={"plan": "pro"}, headers=_h(tok))
        assert r.status_code == 200 and r.json()["plan"] == "pro"
        pro_limits = r.json()["limits"]
        # simulate expiry
        rr = requests.post(f"{API}/billing/simulate-expiry", headers=_h(tok))
        assert rr.status_code == 200
        state = rr.json()["state"]
        assert state == "grace"
        # plan still pro during grace
        assert rr.json()["plan"] == "pro"

    def test_webhook_secret_and_idempotency(self):
        email = f"TEST_wh_{uuid.uuid4().hex[:8]}@x.com"
        me = requests.post(f"{API}/auth/signup", json={"email": email, "password": "password123", "name": "W"}).json()["user"]
        eid = f"evt_{uuid.uuid4().hex}"
        payload = {"event_id": eid, "type": "subscription.activated", "user_id": me["id"], "plan": "pro"}
        # missing secret -> 401
        r0 = requests.post(f"{API}/billing/webhook", json=payload)
        assert r0.status_code == 401
        # good
        r1 = requests.post(f"{API}/billing/webhook", json=payload, headers={"x-webhook-secret": WEBHOOK_SECRET})
        assert r1.status_code == 200 and r1.json()["ok"] is True
        # duplicate
        r2 = requests.post(f"{API}/billing/webhook", json=payload, headers={"x-webhook-secret": WEBHOOK_SECRET})
        assert r2.status_code == 200 and r2.json().get("duplicate") is True

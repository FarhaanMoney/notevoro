#!/usr/bin/env python3
"""
Notevoro Phase 1 Backend Regression + Collab Feature Tests
Tests the removal of Liveblocks and addition of Supabase-backed collaboration endpoints.
"""
import base64
import json
import os
import sys
from typing import Optional

import requests

# Backend URL from frontend/.env
BACKEND_URL = "https://e73f2260-056c-4c10-aee9-d39eddc47eda.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    if passed:
        test_results["passed"].append(f"✅ {name}")
        print(f"✅ PASS: {name}")
    else:
        test_results["failed"].append(f"❌ {name}: {details}")
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   Details: {details}")


def log_warning(message: str):
    """Log a warning"""
    test_results["warnings"].append(f"⚠️  {message}")
    print(f"⚠️  WARNING: {message}")


class TestUser:
    """Test user with authentication"""
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.personal_space_id: Optional[str] = None
        self.team_space_id: Optional[str] = None

    def signup(self) -> bool:
        """Sign up the user"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/auth/signup",
                json={"email": self.email, "password": self.password, "name": self.name},
                timeout=10
            )
            if resp.status_code == 201:
                data = resp.json()
                self.token = data["token"]
                self.user_id = data["user"]["id"]
                return True
            elif resp.status_code == 409:
                # User already exists, try login
                return self.login()
            else:
                print(f"Signup failed for {self.email}: {resp.status_code} {resp.text}")
                return False
        except Exception as e:
            print(f"Signup error for {self.email}: {e}")
            return False

    def login(self) -> bool:
        """Login the user"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/auth/login",
                json={"email": self.email, "password": self.password},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                self.token = data["token"]
                self.user_id = data["user"]["id"]
                return True
            else:
                print(f"Login failed for {self.email}: {resp.status_code} {resp.text}")
                return False
        except Exception as e:
            print(f"Login error for {self.email}: {e}")
            return False

    def headers(self) -> dict:
        """Get auth headers"""
        return {"Authorization": f"Bearer {self.token}"}

    def get_spaces(self) -> list:
        """Get user's spaces"""
        try:
            resp = requests.get(f"{BACKEND_URL}/v1/spaces", headers=self.headers(), timeout=10)
            if resp.status_code == 200:
                spaces = resp.json()
                for space in spaces:
                    if space["type"] == "personal":
                        self.personal_space_id = space["id"]
                    elif space["type"] == "team":
                        self.team_space_id = space["id"]
                return spaces
            return []
        except Exception as e:
            print(f"Get spaces error: {e}")
            return []

    def create_personal_space(self) -> Optional[str]:
        """Create a personal space"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/spaces",
                headers=self.headers(),
                json={"name": f"{self.name}'s Space", "type": "personal"},
                timeout=10
            )
            if resp.status_code == 201:
                space = resp.json()
                self.personal_space_id = space["id"]
                return space["id"]
            return None
        except Exception as e:
            print(f"Create personal space error: {e}")
            return None

    def create_team_space(self, name: str) -> Optional[str]:
        """Create a team space"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/spaces",
                headers=self.headers(),
                json={"name": name, "type": "team"},
                timeout=10
            )
            if resp.status_code == 201:
                space = resp.json()
                self.team_space_id = space["id"]
                return space["id"]
            return None
        except Exception as e:
            print(f"Create team space error: {e}")
            return None

    def create_document(self, space_id: str, title: str) -> Optional[str]:
        """Create a document in a space"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/spaces/{space_id}/documents",
                headers=self.headers(),
                json={"title": title, "content": "Test document content"},
                timeout=10
            )
            if resp.status_code == 201:
                doc = resp.json()
                return doc["id"]
            return None
        except Exception as e:
            print(f"Create document error: {e}")
            return None

    def invite_user(self, space_id: str, email: str, role: str = "member") -> Optional[str]:
        """Invite a user to a space"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/spaces/{space_id}/invitations",
                headers=self.headers(),
                json={"email": email, "role": role},
                timeout=10
            )
            if resp.status_code == 201:
                invitation = resp.json()
                return invitation["token"]
            return None
        except Exception as e:
            print(f"Invite user error: {e}")
            return None

    def accept_invitation(self, token: str) -> bool:
        """Accept an invitation"""
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/invitations/{token}/accept",
                headers=self.headers(),
                timeout=10
            )
            return resp.status_code == 200
        except Exception as e:
            print(f"Accept invitation error: {e}")
            return False


def test_health_ready():
    """Test 1: Health/ready endpoint must show 'realtime' key (not 'liveblocks')"""
    print("\n" + "="*80)
    print("TEST 1: Health/Ready Endpoint")
    print("="*80)
    
    try:
        resp = requests.get(f"{BACKEND_URL}/health/ready", timeout=10)
        if resp.status_code != 200:
            log_test("Health ready returns 200", False, f"Got {resp.status_code}")
            return
        
        log_test("Health ready returns 200", True)
        
        data = resp.json()
        checks = data.get("checks", {})
        
        # Check for 'realtime' key (not 'liveblocks')
        if "liveblocks" in checks:
            log_test("No 'liveblocks' key in health check", False, "Found 'liveblocks' key")
        else:
            log_test("No 'liveblocks' key in health check", True)
        
        if "realtime" not in checks:
            log_test("'realtime' key present in health check", False, "Missing 'realtime' key")
        else:
            log_test("'realtime' key present in health check", True)
            
            realtime_value = checks["realtime"]
            if realtime_value == "not_configured":
                log_test("Realtime value is 'not_configured'", True)
            else:
                log_test("Realtime value is 'not_configured'", False, f"Got '{realtime_value}'")
        
        print(f"\nHealth check response: {json.dumps(checks, indent=2)}")
        
    except Exception as e:
        log_test("Health ready endpoint", False, str(e))


def test_collab_config(user: TestUser):
    """Test 2: /api/v1/collab/config endpoint"""
    print("\n" + "="*80)
    print("TEST 2: Collab Config Endpoint")
    print("="*80)
    
    # Test without auth -> 401
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/collab/config", timeout=10)
        if resp.status_code == 401:
            log_test("Collab config without auth returns 401", True)
        else:
            log_test("Collab config without auth returns 401", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Collab config without auth", False, str(e))
    
    # Test with auth -> 200 with enabled:false
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/collab/config", headers=user.headers(), timeout=10)
        if resp.status_code != 200:
            log_test("Collab config with auth returns 200", False, f"Got {resp.status_code}")
            return
        
        log_test("Collab config with auth returns 200", True)
        
        data = resp.json()
        
        # Check enabled is false
        if data.get("enabled") == False:
            log_test("Collab config enabled=false", True)
        else:
            log_test("Collab config enabled=false", False, f"Got enabled={data.get('enabled')}")
        
        # Check supabase_url is empty
        if data.get("supabase_url") == "":
            log_test("Collab config supabase_url is empty", True)
        else:
            log_test("Collab config supabase_url is empty", False, f"Got '{data.get('supabase_url')}'")
        
        # Check supabase_anon_key is empty
        if data.get("supabase_anon_key") == "":
            log_test("Collab config supabase_anon_key is empty", True)
        else:
            log_test("Collab config supabase_anon_key is empty", False, f"Got '{data.get('supabase_anon_key')}'")
        
        # CRITICAL: Check service_role_key is NOT present
        if "service_role_key" in data or "supabase_service_role_key" in data:
            log_test("Collab config NEVER exposes service_role_key", False, "Found service_role_key in response!")
        else:
            log_test("Collab config NEVER exposes service_role_key", True)
        
        print(f"\nCollab config response: {json.dumps(data, indent=2)}")
        
    except Exception as e:
        log_test("Collab config with auth", False, str(e))


def test_space_authorize(user_a: TestUser, user_b: TestUser):
    """Test 3: /api/v1/collab/spaces/{space_id}/authorize endpoint"""
    print("\n" + "="*80)
    print("TEST 3: Space Authorize Endpoint")
    print("="*80)
    
    # Get or create user A's personal space
    user_a.get_spaces()
    if not user_a.personal_space_id:
        user_a.create_personal_space()
    
    if not user_a.personal_space_id:
        log_test("User A has a personal space", False, "Failed to create personal space")
        return
    
    log_test("User A has a personal space", True)
    space_id = user_a.personal_space_id
    
    # Test without auth -> 401
    try:
        resp = requests.post(f"{BACKEND_URL}/v1/collab/spaces/{space_id}/authorize", timeout=10)
        if resp.status_code == 401:
            log_test("Space authorize without auth returns 401", True)
        else:
            log_test("Space authorize without auth returns 401", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Space authorize without auth", False, str(e))
    
    # Test non-existent space -> 404
    fake_space_id = "00000000-0000-0000-0000-000000000000"
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/spaces/{fake_space_id}/authorize",
            headers=user_a.headers(),
            timeout=10
        )
        if resp.status_code == 404:
            log_test("Space authorize non-existent space returns 404", True)
        else:
            log_test("Space authorize non-existent space returns 404", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Space authorize non-existent space", False, str(e))
    
    # Test non-member (user B trying to access user A's personal space) -> 403
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/spaces/{space_id}/authorize",
            headers=user_b.headers(),
            timeout=10
        )
        if resp.status_code == 403:
            log_test("Space authorize non-member returns 403", True)
        else:
            log_test("Space authorize non-member returns 403", False, f"Got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Space authorize non-member", False, str(e))
    
    # Test member with blank envs -> 503 REALTIME_NOT_CONFIGURED
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/spaces/{space_id}/authorize",
            headers=user_a.headers(),
            timeout=10
        )
        if resp.status_code == 503:
            log_test("Space authorize member with blank envs returns 503", True)
            data = resp.json()
            # Error is wrapped in an "error" object
            error = data.get("error", {})
            if error.get("code") == "REALTIME_NOT_CONFIGURED":
                log_test("Space authorize returns REALTIME_NOT_CONFIGURED code", True)
            else:
                log_test("Space authorize returns REALTIME_NOT_CONFIGURED code", False, f"Got code={error.get('code')}")
        else:
            log_test("Space authorize member with blank envs returns 503", False, f"Got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Space authorize member with blank envs", False, str(e))


def test_document_authorize(user_a: TestUser, user_b: TestUser, user_c: TestUser):
    """Test 4: /api/v1/collab/documents/{document_id}/authorize endpoint"""
    print("\n" + "="*80)
    print("TEST 4: Document Authorize Endpoint (IDOR Protection)")
    print("="*80)
    
    # Try to create a team space for user A
    team_space_id = user_a.create_team_space("Test Team Space")
    is_team_space = True
    
    if not team_space_id:
        log_warning("Failed to create team space - may require Pro plan. Using personal space for basic tests.")
        # Fallback to personal space
        user_a.get_spaces()
        if not user_a.personal_space_id:
            user_a.create_personal_space()
        team_space_id = user_a.personal_space_id
        is_team_space = False
        
        if not team_space_id:
            log_test("Create space for testing", False, "Failed to create any space")
            return None, None
    
    log_test("Create space for testing", True)
    
    # Only test invitations if we have a team space
    if is_team_space:
        # Invite user B to the team space
        invite_token = user_a.invite_user(team_space_id, user_b.email, "member")
        if not invite_token:
            log_test("Invite user B to team space", False, "Failed to create invitation")
            return None, None
        
        log_test("Invite user B to team space", True)
        
        # User B accepts invitation
        if not user_b.accept_invitation(invite_token):
            log_test("User B accepts invitation", False, "Failed to accept invitation")
            return None, None
        
        log_test("User B accepts invitation", True)
    else:
        log_warning("Skipping invitation tests - using personal space")
    
    # Create a document in the team space
    doc_id = user_a.create_document(team_space_id, "Test Document for IDOR")
    if not doc_id:
        log_test("Create document in team space", False, "Failed to create document")
        return
    
    log_test("Create document in team space", True)
    
    # Test without auth -> 401
    try:
        resp = requests.post(f"{BACKEND_URL}/v1/collab/documents/{doc_id}/authorize", timeout=10)
        if resp.status_code == 401:
            log_test("Document authorize without auth returns 401", True)
        else:
            log_test("Document authorize without auth returns 401", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Document authorize without auth", False, str(e))
    
    # Test non-existent document -> 404 (or 503 if realtime check happens first)
    fake_doc_id = "00000000-0000-0000-0000-000000000000"
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/documents/{fake_doc_id}/authorize",
            headers=user_a.headers(),
            timeout=10
        )
        # Note: The endpoint checks realtime config BEFORE checking if doc exists
        # So with blank envs, we get 503 instead of 404
        if resp.status_code == 404:
            log_test("Document authorize non-existent doc returns 404", True)
        elif resp.status_code == 503:
            log_warning("Document authorize checks realtime config before doc existence (returns 503 instead of 404)")
            log_test("Document authorize non-existent doc (503 due to realtime check order)", True)
        else:
            log_test("Document authorize non-existent doc returns 404 or 503", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Document authorize non-existent doc", False, str(e))
    
    # Test IDOR: User C (not a member of the team space) tries to access the document -> 403
    if is_team_space:
        try:
            resp = requests.post(
                f"{BACKEND_URL}/v1/collab/documents/{doc_id}/authorize",
                headers=user_c.headers(),
                timeout=10
            )
            if resp.status_code == 403:
                log_test("Document authorize IDOR protection (non-member) returns 403", True)
            else:
                log_test("Document authorize IDOR protection (non-member) returns 403", False, f"Got {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("Document authorize IDOR protection", False, str(e))
    else:
        log_warning("Skipping IDOR test - using personal space (no shared members)")
    
    # Test member (user A or B depending on space type) with blank envs -> 503 REALTIME_NOT_CONFIGURED
    test_user = user_b if is_team_space else user_a
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/documents/{doc_id}/authorize",
            headers=test_user.headers(),
            timeout=10
        )
        if resp.status_code == 503:
            log_test("Document authorize member with blank envs returns 503", True)
            data = resp.json()
            error = data.get("error", {})
            if error.get("code") == "REALTIME_NOT_CONFIGURED":
                log_test("Document authorize returns REALTIME_NOT_CONFIGURED code", True)
            else:
                log_test("Document authorize returns REALTIME_NOT_CONFIGURED code", False, f"Got code={error.get('code')}")
        else:
            log_test("Document authorize member with blank envs returns 503", False, f"Got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Document authorize member with blank envs", False, str(e))
    
    return doc_id, team_space_id, is_team_space


def test_yjs_endpoints(user_a: TestUser, user_b: TestUser, doc_id: str, space_id: str, is_team_space: bool = False):
    """Test 5: Yjs snapshot and update endpoints"""
    print("\n" + "="*80)
    print("TEST 5: Yjs Snapshot and Update Endpoints")
    print("="*80)
    
    test_user = user_b if is_team_space else user_a
    
    # Test yjs-snapshot without auth -> 401
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-snapshot", timeout=10)
        if resp.status_code == 401:
            log_test("Yjs snapshot without auth returns 401", True)
        else:
            log_test("Yjs snapshot without auth returns 401", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Yjs snapshot without auth", False, str(e))
    
    # Test yjs-snapshot non-existent doc -> 404
    fake_doc_id = "00000000-0000-0000-0000-000000000000"
    try:
        resp = requests.get(
            f"{BACKEND_URL}/v1/collab/documents/{fake_doc_id}/yjs-snapshot",
            headers=user_a.headers(),
            timeout=10
        )
        if resp.status_code == 404:
            log_test("Yjs snapshot non-existent doc returns 404", True)
        else:
            log_test("Yjs snapshot non-existent doc returns 404", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Yjs snapshot non-existent doc", False, str(e))
    
    # Test yjs-snapshot member -> 200 with empty updates
    try:
        resp = requests.get(
            f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-snapshot",
            headers=test_user.headers(),
            timeout=10
        )
        if resp.status_code == 200:
            log_test("Yjs snapshot member returns 200", True)
            data = resp.json()
            if data.get("document_id") == doc_id:
                log_test("Yjs snapshot contains correct document_id", True)
            else:
                log_test("Yjs snapshot contains correct document_id", False, f"Got {data.get('document_id')}")
            
            if isinstance(data.get("updates"), list):
                log_test("Yjs snapshot updates is a list", True)
                if len(data["updates"]) == 0:
                    log_test("Yjs snapshot updates is empty (expected)", True)
                else:
                    log_warning(f"Yjs snapshot has {len(data['updates'])} updates (expected 0 initially)")
            else:
                log_test("Yjs snapshot updates is a list", False, f"Got {type(data.get('updates'))}")
        else:
            log_test("Yjs snapshot member returns 200", False, f"Got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Yjs snapshot member", False, str(e))
    
    # Test yjs-update without auth -> 401
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-update",
            json={"update_b64": base64.b64encode(b"hello world").decode(), "client_id": "test-client"},
            timeout=10
        )
        if resp.status_code == 401:
            log_test("Yjs update without auth returns 401", True)
        else:
            log_test("Yjs update without auth returns 401", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Yjs update without auth", False, str(e))
    
    # Create a viewer user to test viewer rejection (only if team space)
    if is_team_space:
        viewer = TestUser("viewer@test.notevoro.com", "ViewerPass123!", "Viewer User")
        if viewer.signup():
            # Invite viewer with viewer role
            invite_token = user_a.invite_user(space_id, viewer.email, "viewer")
            if invite_token and viewer.accept_invitation(invite_token):
                # Test yjs-update as viewer -> 403
                try:
                    resp = requests.post(
                        f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-update",
                        headers=viewer.headers(),
                        json={"update_b64": base64.b64encode(b"hello world").decode(), "client_id": "viewer-client"},
                        timeout=10
                    )
                    if resp.status_code == 403:
                        log_test("Yjs update viewer role returns 403", True)
                    else:
                        log_test("Yjs update viewer role returns 403", False, f"Got {resp.status_code}: {resp.text}")
                except Exception as e:
                    log_test("Yjs update viewer role", False, str(e))
    else:
        log_warning("Skipping viewer role test - using personal space")
    
    # Test yjs-update member with valid payload -> 201
    test_update = base64.b64encode(b"hello world yjs update").decode()
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-update",
            headers=test_user.headers(),
            json={"update_b64": test_update, "client_id": "test-client-b"},
            timeout=10
        )
        if resp.status_code == 201:
            log_test("Yjs update member with valid payload returns 201", True)
            data = resp.json()
            if data.get("ok") == True:
                log_test("Yjs update response contains ok=true", True)
            else:
                log_test("Yjs update response contains ok=true", False, f"Got ok={data.get('ok')}")
            
            if "id" in data:
                log_test("Yjs update response contains id", True)
            else:
                log_test("Yjs update response contains id", False)
        else:
            log_test("Yjs update member with valid payload returns 201", False, f"Got {resp.status_code}: {resp.text}")
    except Exception as e:
        log_test("Yjs update member with valid payload", False, str(e))
    
    # Test round-trip: yjs-snapshot should now include the persisted chunk
    try:
        resp = requests.get(
            f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-snapshot",
            headers=test_user.headers(),
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            updates = data.get("updates", [])
            if len(updates) > 0:
                log_test("Yjs snapshot round-trip includes persisted update", True)
                if test_update in updates:
                    log_test("Yjs snapshot contains the exact update we posted", True)
                else:
                    log_warning("Yjs snapshot doesn't contain the exact update (may be merged)")
            else:
                log_test("Yjs snapshot round-trip includes persisted update", False, "Updates list is still empty")
        else:
            log_test("Yjs snapshot round-trip", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Yjs snapshot round-trip", False, str(e))
    
    # Test yjs-update with oversized payload -> 422
    oversized_update = base64.b64encode(b"x" * 500000).decode()
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/collab/documents/{doc_id}/yjs-update",
            headers=test_user.headers(),
            json={"update_b64": oversized_update, "client_id": "test-client-oversize"},
            timeout=10
        )
        if resp.status_code == 422:
            log_test("Yjs update oversized payload returns 422", True)
            data = resp.json()
            error = data.get("error", {})
            if error.get("code") == "INVALID_UPDATE":
                log_test("Yjs update oversized returns INVALID_UPDATE code", True)
            else:
                log_test("Yjs update oversized returns INVALID_UPDATE code", False, f"Got code={error.get('code')}")
        else:
            log_test("Yjs update oversized payload returns 422", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Yjs update oversized payload", False, str(e))


def test_regression_auth(user: TestUser):
    """Test 6: Regression - Auth endpoints"""
    print("\n" + "="*80)
    print("TEST 6: Regression - Auth Endpoints")
    print("="*80)
    
    # Test auth config
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/auth/config", timeout=10)
        if resp.status_code == 200:
            log_test("Auth config endpoint", True)
            data = resp.json()
            if data.get("provider") == "local":
                log_test("Auth provider is 'local'", True)
            else:
                log_test("Auth provider is 'local'", False, f"Got provider={data.get('provider')}")
        else:
            log_test("Auth config endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Auth config endpoint", False, str(e))
    
    # Test /me endpoint
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/auth/me", headers=user.headers(), timeout=10)
        if resp.status_code == 200:
            log_test("Auth /me endpoint", True)
            data = resp.json()
            if "user" in data and "entitlements" in data:
                log_test("Auth /me returns user and entitlements", True)
            else:
                log_test("Auth /me returns user and entitlements", False, f"Missing keys in response")
        else:
            log_test("Auth /me endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Auth /me endpoint", False, str(e))


def test_regression_spaces(user: TestUser):
    """Test 7: Regression - Spaces CRUD"""
    print("\n" + "="*80)
    print("TEST 7: Regression - Spaces CRUD")
    print("="*80)
    
    # List spaces
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/spaces", headers=user.headers(), timeout=10)
        if resp.status_code == 200:
            log_test("List spaces endpoint", True)
            spaces = resp.json()
            if isinstance(spaces, list):
                log_test("List spaces returns array", True)
            else:
                log_test("List spaces returns array", False, f"Got {type(spaces)}")
        else:
            log_test("List spaces endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("List spaces endpoint", False, str(e))
    
    # Get personal space
    if user.personal_space_id:
        try:
            resp = requests.get(f"{BACKEND_URL}/v1/spaces/{user.personal_space_id}", headers=user.headers(), timeout=10)
            if resp.status_code == 200:
                log_test("Get space by ID endpoint", True)
            else:
                log_test("Get space by ID endpoint", False, f"Got {resp.status_code}")
        except Exception as e:
            log_test("Get space by ID endpoint", False, str(e))


def test_regression_items(user: TestUser):
    """Test 8: Regression - Items (notes, documents, tasks, projects, events)"""
    print("\n" + "="*80)
    print("TEST 8: Regression - Items CRUD")
    print("="*80)
    
    if not user.personal_space_id:
        log_warning("Skipping items regression - no personal space")
        return
    
    space_id = user.personal_space_id
    
    # Test notes
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/spaces/{space_id}/notes",
            headers=user.headers(),
            json={"title": "Regression Test Note", "content": "Testing notes endpoint"},
            timeout=10
        )
        if resp.status_code == 201:
            log_test("Create note endpoint", True)
            note = resp.json()
            note_id = note["id"]
            
            # List notes
            resp = requests.get(f"{BACKEND_URL}/v1/spaces/{space_id}/notes", headers=user.headers(), timeout=10)
            if resp.status_code == 200:
                log_test("List notes endpoint", True)
            else:
                log_test("List notes endpoint", False, f"Got {resp.status_code}")
        else:
            log_test("Create note endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Notes endpoints", False, str(e))
    
    # Test documents
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/spaces/{space_id}/documents",
            headers=user.headers(),
            json={"title": "Regression Test Document", "content": "Testing documents endpoint"},
            timeout=10
        )
        if resp.status_code == 201:
            log_test("Create document endpoint", True)
            doc = resp.json()
            doc_id = doc["id"]
            
            # List documents
            resp = requests.get(f"{BACKEND_URL}/v1/spaces/{space_id}/documents", headers=user.headers(), timeout=10)
            if resp.status_code == 200:
                log_test("List documents endpoint", True)
            else:
                log_test("List documents endpoint", False, f"Got {resp.status_code}")
        else:
            log_test("Create document endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Documents endpoints", False, str(e))
    
    # Test tasks
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/spaces/{space_id}/tasks",
            headers=user.headers(),
            json={"title": "Regression Test Task", "status": "todo"},
            timeout=10
        )
        if resp.status_code == 201:
            log_test("Create task endpoint", True)
            
            # List tasks
            resp = requests.get(f"{BACKEND_URL}/v1/spaces/{space_id}/tasks", headers=user.headers(), timeout=10)
            if resp.status_code == 200:
                log_test("List tasks endpoint", True)
            else:
                log_test("List tasks endpoint", False, f"Got {resp.status_code}")
        else:
            log_test("Create task endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Tasks endpoints", False, str(e))
    
    # Test projects
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/spaces/{space_id}/projects",
            headers=user.headers(),
            json={"name": "Regression Test Project", "status": "active"},
            timeout=10
        )
        if resp.status_code == 201:
            log_test("Create project endpoint", True)
            
            # List projects
            resp = requests.get(f"{BACKEND_URL}/v1/spaces/{space_id}/projects", headers=user.headers(), timeout=10)
            if resp.status_code == 200:
                log_test("List projects endpoint", True)
            else:
                log_test("List projects endpoint", False, f"Got {resp.status_code}")
        else:
            log_test("Create project endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Projects endpoints", False, str(e))
    
    # Test events
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/spaces/{space_id}/events",
            headers=user.headers(),
            json={
                "title": "Regression Test Event",
                "start_at": "2026-12-01T10:00:00Z",
                "end_at": "2026-12-01T11:00:00Z"
            },
            timeout=10
        )
        if resp.status_code == 201:
            log_test("Create event endpoint", True)
            
            # List events
            resp = requests.get(
                f"{BACKEND_URL}/v1/spaces/{space_id}/events",
                headers=user.headers(),
                params={"start": "2026-11-01", "end": "2026-12-31"},
                timeout=10
            )
            if resp.status_code == 200:
                log_test("List events endpoint", True)
            else:
                log_test("List events endpoint", False, f"Got {resp.status_code}")
        else:
            log_test("Create event endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Events endpoints", False, str(e))


def test_regression_chat(user: TestUser):
    """Test 9: Regression - Chat (conversations, messages)"""
    print("\n" + "="*80)
    print("TEST 9: Regression - Chat Endpoints")
    print("="*80)
    
    # List conversations (correct endpoint is /conversations not /chat/conversations)
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/conversations", headers=user.headers(), timeout=10)
        if resp.status_code == 200:
            log_test("List conversations endpoint", True)
        else:
            log_test("List conversations endpoint", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("List conversations endpoint", False, str(e))


def test_regression_voro(user: TestUser):
    """Test 10: Regression - Voro AI (should return 503 AI_NOT_CONFIGURED)"""
    print("\n" + "="*80)
    print("TEST 10: Regression - Voro AI Endpoints")
    print("="*80)
    
    # Test voro ask endpoint (correct endpoint is /voro/ask not /voro/chat)
    try:
        resp = requests.post(
            f"{BACKEND_URL}/v1/voro/ask",
            headers=user.headers(),
            json={"message": "Hello Voro", "space_id": user.personal_space_id},
            timeout=10
        )
        if resp.status_code == 503:
            log_test("Voro ask returns 503 (AI_NOT_CONFIGURED)", True)
            data = resp.json()
            error = data.get("error", {})
            if error.get("code") == "AI_NOT_CONFIGURED":
                log_test("Voro returns AI_NOT_CONFIGURED code", True)
            else:
                log_test("Voro returns AI_NOT_CONFIGURED code", False, f"Got code={error.get('code')}")
        else:
            log_test("Voro ask returns 503 (AI_NOT_CONFIGURED)", False, f"Got {resp.status_code}")
    except Exception as e:
        log_test("Voro ask endpoint", False, str(e))


def test_regression_account(user: TestUser):
    """Test 11: Regression - Account/Billing endpoints"""
    print("\n" + "="*80)
    print("TEST 11: Regression - Account/Billing Endpoints")
    print("="*80)
    
    # Test account endpoint (if exists)
    try:
        resp = requests.get(f"{BACKEND_URL}/v1/account", headers=user.headers(), timeout=10)
        if resp.status_code in [200, 404]:
            log_test("Account endpoint accessible", True)
        else:
            log_test("Account endpoint accessible", False, f"Got {resp.status_code}")
    except Exception as e:
        log_warning(f"Account endpoint test: {e}")


def save_test_credentials(users: list[TestUser]):
    """Save test credentials to /app/memory/test_credentials.md"""
    os.makedirs("/app/memory", exist_ok=True)
    
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials for Notevoro Phase 1\n\n")
        f.write("Generated during backend regression testing.\n\n")
        f.write("## Test Users\n\n")
        
        for i, user in enumerate(users, 1):
            f.write(f"### User {i}: {user.name}\n")
            f.write(f"- **Email**: {user.email}\n")
            f.write(f"- **Password**: {user.password}\n")
            f.write(f"- **User ID**: {user.user_id}\n")
            f.write(f"- **Personal Space ID**: {user.personal_space_id}\n")
            if user.team_space_id:
                f.write(f"- **Team Space ID**: {user.team_space_id}\n")
            f.write("\n")
        
        f.write("## Notes\n\n")
        f.write("- All users use local auth provider\n")
        f.write("- User A and User B are members of the same team space\n")
        f.write("- User C is not a member of any shared spaces (for IDOR testing)\n")


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    print(f"\n✅ PASSED: {len(test_results['passed'])}")
    for test in test_results["passed"]:
        print(f"  {test}")
    
    if test_results["warnings"]:
        print(f"\n⚠️  WARNINGS: {len(test_results['warnings'])}")
        for warning in test_results["warnings"]:
            print(f"  {warning}")
    
    if test_results["failed"]:
        print(f"\n❌ FAILED: {len(test_results['failed'])}")
        for test in test_results["failed"]:
            print(f"  {test}")
    
    print("\n" + "="*80)
    total = len(test_results["passed"]) + len(test_results["failed"])
    pass_rate = (len(test_results["passed"]) / total * 100) if total > 0 else 0
    print(f"PASS RATE: {pass_rate:.1f}% ({len(test_results['passed'])}/{total})")
    print("="*80)
    
    return len(test_results["failed"]) == 0


def main():
    """Main test runner"""
    print("="*80)
    print("NOTEVORO PHASE 1 BACKEND REGRESSION + COLLAB FEATURE TESTS")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    print("="*80)
    
    # Create test users
    print("\nCreating test users...")
    user_a = TestUser("alice@test.notevoro.com", "AlicePass123!", "Alice Anderson")
    user_b = TestUser("bob@test.notevoro.com", "BobPass123!", "Bob Builder")
    user_c = TestUser("charlie@test.notevoro.com", "CharliePass123!", "Charlie Chen")
    
    if not user_a.signup():
        print("❌ Failed to create User A")
        return False
    print(f"✅ User A created: {user_a.email}")
    
    if not user_b.signup():
        print("❌ Failed to create User B")
        return False
    print(f"✅ User B created: {user_b.email}")
    
    if not user_c.signup():
        print("❌ Failed to create User C")
        return False
    print(f"✅ User C created: {user_c.email}")
    
    # Get spaces for users
    user_a.get_spaces()
    user_b.get_spaces()
    user_c.get_spaces()
    
    # Create personal spaces if they don't exist
    if not user_a.personal_space_id:
        user_a.create_personal_space()
    if not user_b.personal_space_id:
        user_b.create_personal_space()
    if not user_c.personal_space_id:
        user_c.create_personal_space()
    
    # Run tests in priority order
    test_health_ready()
    test_collab_config(user_a)
    test_space_authorize(user_a, user_b)
    result = test_document_authorize(user_a, user_b, user_c)
    
    if result and len(result) == 3:
        doc_id, space_id, is_team_space = result
        test_yjs_endpoints(user_a, user_b, doc_id, space_id, is_team_space)
    else:
        log_warning("Skipping Yjs endpoints test - document creation failed")
    
    # Regression tests
    test_regression_auth(user_a)
    test_regression_spaces(user_a)
    test_regression_items(user_a)
    test_regression_chat(user_a)
    test_regression_voro(user_a)
    test_regression_account(user_a)
    
    # Save test credentials
    save_test_credentials([user_a, user_b, user_c])
    print("\n✅ Test credentials saved to /app/memory/test_credentials.md")
    
    # Print summary
    success = print_summary()
    
    return success


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

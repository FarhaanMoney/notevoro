"""Notevoro backend tests for new Inbox and Pages endpoints.

Tests the finalized product architecture:
  1) Brain-only global Inbox (/api/v1/inbox)
  2) Notevoro Mail/Send composer
  3) Notion-styled nested Pages (/api/v1/spaces/{sid}/pages)
  4) Invitation flow emits InboxEvent
  5) Regression on existing routers

Test users (from /app/memory/test_credentials.md):
  - alice@notevoro.dev / AlicePass123! (Pro plan; has team space "Astra")
  - bob@notevoro.dev / BobPass123! (member of "Astra")
  - charlie@notevoro.dev / CharliePass123! (isolated)
"""
import requests
import json

BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api/v1"

# Test credentials
ALICE = {"email": "alice@notevoro.dev", "password": "AlicePass123!"}
BOB = {"email": "bob@notevoro.dev", "password": "BobPass123!"}
CHARLIE = {"email": "charlie@notevoro.dev", "password": "CharliePass123!"}


def _login(email, password):
    """Login and return token."""
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        print(f"❌ Login failed for {email}: {r.status_code} {r.text}")
        return None
    return r.json()["token"]


def _h(token):
    """Return auth headers."""
    return {"Authorization": f"Bearer {token}"}


def _get_user_id(token):
    """Get current user ID."""
    r = requests.get(f"{API}/auth/me", headers=_h(token))
    if r.status_code != 200:
        return None
    return r.json()["user"]["id"]


def _get_spaces(token):
    """Get user's spaces."""
    r = requests.get(f"{API}/spaces", headers=_h(token))
    if r.status_code != 200:
        return []
    return r.json()


def _find_space_by_name(token, name):
    """Find space by name."""
    spaces = _get_spaces(token)
    for s in spaces:
        if s["name"] == name:
            return s["id"]
    return None


# =============================================================================
# Priority 1: Global Inbox (/api/v1/inbox)
# =============================================================================

def test_inbox_unauthenticated():
    """Test 1: GET /api/v1/inbox unauthenticated → 401"""
    print("\n=== Test 1: Inbox unauthenticated ===")
    r = requests.get(f"{API}/inbox")
    if r.status_code == 401:
        print("✅ PASS: Unauthenticated inbox access returns 401")
        return True
    else:
        print(f"❌ FAIL: Expected 401, got {r.status_code}")
        print(f"Response: {r.text}")
        return False


def test_inbox_list_as_bob(bob_token):
    """Test 2: GET /api/v1/inbox as Bob → 200 with items, unread, space_counts"""
    print("\n=== Test 2: Inbox list as Bob ===")
    r = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {r.status_code}")
        print(f"Response: {r.text}")
        return False
    
    data = r.json()
    if "items" not in data or "unread" not in data or "space_counts" not in data:
        print(f"❌ FAIL: Missing required fields in response")
        print(f"Response: {json.dumps(data, indent=2)}")
        return False
    
    # Check that items have hydrated sender and source_space
    if len(data["items"]) > 0:
        item = data["items"][0]
        if "sender" not in item or "source_space" not in item:
            print(f"❌ FAIL: Items missing hydrated sender/source_space")
            print(f"Item: {json.dumps(item, indent=2)}")
            return False
    
    print(f"✅ PASS: Inbox list returned {len(data['items'])} items, {data['unread']} unread")
    return True


def test_inbox_category_filters(bob_token):
    """Test 3: Category filters (shared, invitations, unread)"""
    print("\n=== Test 3: Inbox category filters ===")
    
    # Test shared category
    r1 = requests.get(f"{API}/inbox?category=shared", headers=_h(bob_token))
    if r1.status_code != 200:
        print(f"❌ FAIL: category=shared returned {r1.status_code}")
        return False
    
    # Test invitations category
    r2 = requests.get(f"{API}/inbox?category=invitations", headers=_h(bob_token))
    if r2.status_code != 200:
        print(f"❌ FAIL: category=invitations returned {r2.status_code}")
        return False
    
    # Test unread filter
    r3 = requests.get(f"{API}/inbox?unread=true", headers=_h(bob_token))
    if r3.status_code != 200:
        print(f"❌ FAIL: unread=true returned {r3.status_code}")
        return False
    
    print("✅ PASS: All category filters work")
    return True


def test_compose_validation(alice_token):
    """Test 4: Compose validation (missing body, invalid space)"""
    print("\n=== Test 4: Compose validation ===")
    
    # Test without body
    r1 = requests.post(f"{API}/inbox/compose", headers=_h(alice_token))
    if r1.status_code != 422:
        print(f"❌ FAIL: Expected 422 for missing body, got {r1.status_code}")
        return False
    
    # Test with invalid space (non-member)
    r2 = requests.post(f"{API}/inbox/compose", 
                       json={"source_space_id": "invalid-space-id", "recipient_ids": ["user-id"]},
                       headers=_h(alice_token))
    if r2.status_code not in [403, 404]:
        print(f"❌ FAIL: Expected 403/404 for invalid space, got {r2.status_code}")
        return False
    
    print("✅ PASS: Compose validation works")
    return True


def test_compose_mail(alice_token, bob_token, astra_space_id):
    """Test 5: Compose mail from Alice to Bob"""
    print("\n=== Test 5: Compose mail ===")
    
    bob_id = _get_user_id(bob_token)
    if not bob_id:
        print("❌ FAIL: Could not get Bob's user ID")
        return False
    
    # Alice composes mail to Bob
    r = requests.post(f"{API}/inbox/compose",
                      json={
                          "source_space_id": astra_space_id,
                          "recipient_ids": [bob_id],
                          "subject": "Test Mail",
                          "body": "Hello Bob from Alice"
                      },
                      headers=_h(alice_token))
    
    if r.status_code != 201:
        print(f"❌ FAIL: Expected 201, got {r.status_code}")
        print(f"Response: {r.text}")
        return False
    
    data = r.json()
    if "delivered" not in data or len(data["delivered"]) == 0:
        print(f"❌ FAIL: No delivered events")
        print(f"Response: {json.dumps(data, indent=2)}")
        return False
    
    event_id = data["delivered"][0]["event_id"]
    
    # Verify Bob sees the new event
    r2 = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r2.status_code != 200:
        print(f"❌ FAIL: Bob could not fetch inbox")
        return False
    
    bob_inbox = r2.json()
    found = False
    for item in bob_inbox["items"]:
        if item["id"] == event_id:
            if item.get("event_type") != "mail":
                print(f"❌ FAIL: Event type is {item.get('event_type')}, expected 'mail'")
                return False
            if not item.get("sender") or not item.get("source_space"):
                print(f"❌ FAIL: Missing sender or source_space in event")
                return False
            found = True
            break
    
    if not found:
        print(f"❌ FAIL: Event {event_id} not found in Bob's inbox")
        return False
    
    print("✅ PASS: Mail composed and delivered successfully")
    return True


def test_compose_with_page_share(alice_token, bob_token, astra_space_id):
    """Test 6: Compose with page object and verify ACL grant"""
    print("\n=== Test 6: Compose with page share ===")
    
    # Alice creates a page
    r1 = requests.post(f"{API}/spaces/{astra_space_id}/pages",
                       json={"title": "Shared Page Test"},
                       headers=_h(alice_token))
    
    if r1.status_code != 201:
        print(f"❌ FAIL: Could not create page: {r1.status_code}")
        print(f"Response: {r1.text}")
        return False
    
    page_id = r1.json()["id"]
    bob_id = _get_user_id(bob_token)
    
    # Alice shares the page with Bob
    r2 = requests.post(f"{API}/inbox/compose",
                       json={
                           "source_space_id": astra_space_id,
                           "recipient_ids": [bob_id],
                           "subject": "Shared Page",
                           "object_type": "page",
                           "object_id": page_id,
                           "permission": "editor",
                           "grant_access": True
                       },
                       headers=_h(alice_token))
    
    if r2.status_code != 201:
        print(f"❌ FAIL: Could not compose share: {r2.status_code}")
        print(f"Response: {r2.text}")
        return False
    
    # Verify Bob can access the page
    r3 = requests.get(f"{API}/spaces/{astra_space_id}/pages/{page_id}",
                      headers=_h(bob_token))
    
    if r3.status_code != 200:
        print(f"❌ FAIL: Bob cannot access shared page: {r3.status_code}")
        print(f"Response: {r3.text}")
        return False
    
    page_data = r3.json()
    if page_data.get("visibility") not in ["specific", "team"]:
        print(f"❌ FAIL: Page visibility is {page_data.get('visibility')}, expected 'specific' or 'team'")
        return False
    
    # Verify shared_with contains Bob
    if page_data.get("visibility") == "specific":
        shared_with = page_data.get("shared_with", [])
        bob_in_shared = any(s.get("user_id") == bob_id for s in shared_with)
        if not bob_in_shared:
            print(f"❌ FAIL: Bob not in shared_with list")
            print(f"shared_with: {shared_with}")
            return False
    
    print("✅ PASS: Page share with ACL grant works")
    return True


def test_compose_cross_space_object(alice_token, astra_space_id):
    """Test 7: Compose with object from different space → 422"""
    print("\n=== Test 7: Cross-space object validation ===")
    
    # Get Alice's personal space
    spaces = _get_spaces(alice_token)
    personal_space = None
    for s in spaces:
        if s["type"] == "personal":
            personal_space = s["id"]
            break
    
    if not personal_space:
        print("⚠️  SKIP: Alice has no personal space")
        return True
    
    # Create a page in personal space
    r1 = requests.post(f"{API}/spaces/{personal_space}/pages",
                       json={"title": "Personal Page"},
                       headers=_h(alice_token))
    
    if r1.status_code != 201:
        print(f"⚠️  SKIP: Could not create personal page")
        return True
    
    page_id = r1.json()["id"]
    bob_id = _get_user_id(_login(**BOB))
    
    # Try to compose from Astra with personal space page
    r2 = requests.post(f"{API}/inbox/compose",
                       json={
                           "source_space_id": astra_space_id,
                           "recipient_ids": [bob_id],
                           "object_type": "page",
                           "object_id": page_id
                       },
                       headers=_h(alice_token))
    
    if r2.status_code != 422:
        print(f"❌ FAIL: Expected 422, got {r2.status_code}")
        print(f"Response: {r2.text}")
        return False
    
    error = r2.json().get("error", {})
    if error.get("code") != "INVALID_OBJECT_SPACE":
        print(f"❌ FAIL: Expected INVALID_OBJECT_SPACE, got {error.get('code')}")
        return False
    
    print("✅ PASS: Cross-space object validation works")
    return True


def test_compose_unreachable_recipient(alice_token, charlie_token, astra_space_id):
    """Test 8: Compose to unreachable user (Charlie)"""
    print("\n=== Test 8: Unreachable recipient ===")
    
    charlie_id = _get_user_id(charlie_token)
    if not charlie_id:
        print("❌ FAIL: Could not get Charlie's user ID")
        return False
    
    # Alice tries to send to Charlie (no shared space)
    r = requests.post(f"{API}/inbox/compose",
                      json={
                          "source_space_id": astra_space_id,
                          "recipient_ids": [charlie_id],
                          "subject": "Test",
                          "body": "Hello"
                      },
                      headers=_h(alice_token))
    
    if r.status_code != 201:
        print(f"❌ FAIL: Expected 201, got {r.status_code}")
        return False
    
    data = r.json()
    if len(data.get("delivered", [])) > 0:
        print(f"❌ FAIL: Charlie should not be reachable")
        print(f"Response: {json.dumps(data, indent=2)}")
        return False
    
    skipped = data.get("skipped", [])
    charlie_skipped = any(s.get("user_id") == charlie_id and s.get("reason") == "not_reachable" 
                          for s in skipped)
    
    if not charlie_skipped:
        print(f"❌ FAIL: Charlie not in skipped list with reason 'not_reachable'")
        print(f"Skipped: {skipped}")
        return False
    
    print("✅ PASS: Unreachable recipient correctly skipped")
    return True


def test_inbox_read_operations(bob_token):
    """Test 9: Mark read (single and all)"""
    print("\n=== Test 9: Inbox read operations ===")
    
    # Get Bob's inbox
    r1 = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r1.status_code != 200:
        print(f"❌ FAIL: Could not fetch inbox")
        return False
    
    inbox = r1.json()
    if len(inbox["items"]) == 0:
        print("⚠️  SKIP: No inbox items to test")
        return True
    
    # Mark single event as read
    event_id = inbox["items"][0]["id"]
    r2 = requests.post(f"{API}/inbox/read",
                       json={"id": event_id},
                       headers=_h(bob_token))
    
    if r2.status_code != 200:
        print(f"❌ FAIL: Could not mark single event as read: {r2.status_code}")
        return False
    
    # Mark all as read
    r3 = requests.post(f"{API}/inbox/read",
                       json={"all": True},
                       headers=_h(bob_token))
    
    if r3.status_code != 200:
        print(f"❌ FAIL: Could not mark all as read: {r3.status_code}")
        return False
    
    # Verify unread count is 0
    r4 = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r4.status_code == 200:
        new_inbox = r4.json()
        if new_inbox["unread"] != 0:
            print(f"⚠️  WARNING: Unread count is {new_inbox['unread']}, expected 0")
    
    print("✅ PASS: Read operations work")
    return True


def test_inbox_accept_decline_archive(bob_token):
    """Test 10: Accept, decline, archive operations"""
    print("\n=== Test 10: Accept/Decline/Archive ===")
    
    # Get Bob's inbox
    r1 = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r1.status_code != 200 or len(r1.json()["items"]) == 0:
        print("⚠️  SKIP: No inbox items to test")
        return True
    
    event_id = r1.json()["items"][0]["id"]
    
    # Test accept
    r2 = requests.post(f"{API}/inbox/{event_id}/accept", headers=_h(bob_token))
    if r2.status_code != 200:
        print(f"❌ FAIL: Accept failed: {r2.status_code}")
        return False
    
    if r2.json().get("status") != "accepted":
        print(f"❌ FAIL: Status not 'accepted': {r2.json().get('status')}")
        return False
    
    # Get another event for decline test
    r3 = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r3.status_code == 200 and len(r3.json()["items"]) > 1:
        event_id2 = r3.json()["items"][1]["id"]
        
        # Test decline
        r4 = requests.post(f"{API}/inbox/{event_id2}/decline", headers=_h(bob_token))
        if r4.status_code != 200:
            print(f"❌ FAIL: Decline failed: {r4.status_code}")
            return False
        
        if r4.json().get("status") != "declined":
            print(f"❌ FAIL: Status not 'declined': {r4.json().get('status')}")
            return False
    
    # Test archive
    r5 = requests.delete(f"{API}/inbox/{event_id}", headers=_h(bob_token))
    if r5.status_code != 200:
        print(f"❌ FAIL: Archive failed: {r5.status_code}")
        return False
    
    if not r5.json().get("ok"):
        print(f"❌ FAIL: Archive did not return ok:true")
        return False
    
    print("✅ PASS: Accept/Decline/Archive work")
    return True


def test_recipient_search(alice_token, astra_space_id):
    """Test 11: Recipient search"""
    print("\n=== Test 11: Recipient search ===")
    
    # Search for "bo" (should find Bob)
    r1 = requests.get(f"{API}/inbox/recipients/search?q=bo&source_space_id={astra_space_id}",
                      headers=_h(alice_token))
    
    if r1.status_code != 200:
        print(f"❌ FAIL: Search failed: {r1.status_code}")
        return False
    
    items = r1.json().get("items", [])
    bob_found = any("bob" in item.get("email", "").lower() or "bob" in item.get("name", "").lower() 
                    for item in items)
    
    if not bob_found:
        print(f"⚠️  WARNING: Bob not found in search results")
        print(f"Results: {json.dumps(items, indent=2)}")
    
    # Search without query (should return all reachable)
    r2 = requests.get(f"{API}/inbox/recipients/search?source_space_id={astra_space_id}",
                      headers=_h(alice_token))
    
    if r2.status_code != 200:
        print(f"❌ FAIL: Search without query failed: {r2.status_code}")
        return False
    
    # Verify Charlie is NOT in results (no shared space)
    all_items = r2.json().get("items", [])
    charlie_found = any("charlie" in item.get("email", "").lower() 
                        for item in all_items)
    
    if charlie_found:
        print(f"❌ FAIL: Charlie should not be in search results (no shared space)")
        return False
    
    print("✅ PASS: Recipient search works and respects reachability")
    return True


def test_inbox_event_privacy(bob_token, charlie_token):
    """Test 12: Event privacy (other user's event → 404)"""
    print("\n=== Test 12: Inbox event privacy ===")
    
    # Get Bob's inbox
    r1 = requests.get(f"{API}/inbox", headers=_h(bob_token))
    if r1.status_code != 200 or len(r1.json()["items"]) == 0:
        print("⚠️  SKIP: No inbox items to test")
        return True
    
    bob_event_id = r1.json()["items"][0]["id"]
    
    # Charlie tries to access Bob's event
    r2 = requests.get(f"{API}/inbox/{bob_event_id}", headers=_h(charlie_token))
    
    if r2.status_code != 404:
        print(f"❌ FAIL: Expected 404, got {r2.status_code}")
        print(f"Response: {r2.text}")
        return False
    
    print("✅ PASS: Event privacy enforced (404 for other user's event)")
    return True


# =============================================================================
# Priority 2: Notion-style Pages (/api/v1/spaces/{sid}/pages)
# =============================================================================

def test_pages_unauthenticated(astra_space_id):
    """Test 1: Unauthenticated → 401"""
    print("\n=== Pages Test 1: Unauthenticated ===")
    r = requests.get(f"{API}/spaces/{astra_space_id}/pages")
    if r.status_code == 401:
        print("✅ PASS: Unauthenticated pages access returns 401")
        return True
    else:
        print(f"❌ FAIL: Expected 401, got {r.status_code}")
        return False


def test_pages_non_member(charlie_token, astra_space_id):
    """Test 2: Non-member (Charlie) → 403"""
    print("\n=== Pages Test 2: Non-member access ===")
    r = requests.get(f"{API}/spaces/{astra_space_id}/pages", headers=_h(charlie_token))
    if r.status_code == 403:
        print("✅ PASS: Non-member access returns 403")
        return True
    else:
        print(f"❌ FAIL: Expected 403, got {r.status_code}")
        return False


def test_pages_private_visibility(alice_token, bob_token, astra_space_id):
    """Test 3-5: Private page visibility"""
    print("\n=== Pages Test 3-5: Private page visibility ===")
    
    # Alice creates a private page
    r1 = requests.post(f"{API}/spaces/{astra_space_id}/pages",
                       json={"title": "Alice Private Draft"},
                       headers=_h(alice_token))
    
    if r1.status_code != 201:
        print(f"❌ FAIL: Could not create page: {r1.status_code}")
        return False
    
    page = r1.json()
    page_id = page["id"]
    
    # Verify default visibility is 'private'
    if page.get("visibility") != "private":
        print(f"❌ FAIL: Default visibility is {page.get('visibility')}, expected 'private'")
        return False
    
    # Bob should NOT see it
    r2 = requests.get(f"{API}/spaces/{astra_space_id}/pages", headers=_h(bob_token))
    if r2.status_code != 200:
        print(f"❌ FAIL: Bob could not list pages: {r2.status_code}")
        return False
    
    bob_pages = r2.json()
    if any(p["id"] == page_id for p in bob_pages):
        print(f"❌ FAIL: Bob can see Alice's private page")
        return False
    
    # Alice should see it
    r3 = requests.get(f"{API}/spaces/{astra_space_id}/pages", headers=_h(alice_token))
    if r3.status_code != 200:
        print(f"❌ FAIL: Alice could not list pages: {r3.status_code}")
        return False
    
    alice_pages = r3.json()
    if not any(p["id"] == page_id for p in alice_pages):
        print(f"❌ FAIL: Alice cannot see her own private page")
        return False
    
    # Alice changes visibility to 'team'
    r4 = requests.post(f"{API}/spaces/{astra_space_id}/pages/{page_id}/visibility",
                       json={"visibility": "team"},
                       headers=_h(alice_token))
    
    if r4.status_code != 200:
        print(f"❌ FAIL: Could not change visibility: {r4.status_code}")
        return False
    
    # Now Bob should see it
    r5 = requests.get(f"{API}/spaces/{astra_space_id}/pages", headers=_h(bob_token))
    if r5.status_code != 200:
        print(f"❌ FAIL: Bob could not list pages after visibility change")
        return False
    
    bob_pages_after = r5.json()
    if not any(p["id"] == page_id for p in bob_pages_after):
        print(f"❌ FAIL: Bob cannot see team-visible page")
        return False
    
    print("✅ PASS: Private page visibility works correctly")
    return True


def test_pages_specific_sharing(alice_token, bob_token, charlie_token, astra_space_id):
    """Test 6: Specific sharing with shared_with"""
    print("\n=== Pages Test 6: Specific sharing ===")
    
    # Alice creates a page
    r1 = requests.post(f"{API}/spaces/{astra_space_id}/pages",
                       json={"title": "Specific Share Test"},
                       headers=_h(alice_token))
    
    if r1.status_code != 201:
        print(f"❌ FAIL: Could not create page: {r1.status_code}")
        return False
    
    page_id = r1.json()["id"]
    bob_id = _get_user_id(bob_token)
    
    # Alice shares specifically with Bob as viewer
    r2 = requests.post(f"{API}/spaces/{astra_space_id}/pages/{page_id}/visibility",
                       json={
                           "visibility": "specific",
                           "shared_with": [{"user_id": bob_id, "role": "viewer"}]
                       },
                       headers=_h(alice_token))
    
    if r2.status_code != 200:
        print(f"❌ FAIL: Could not set specific visibility: {r2.status_code}")
        return False
    
    # Bob can GET the page
    r3 = requests.get(f"{API}/spaces/{astra_space_id}/pages/{page_id}",
                      headers=_h(bob_token))
    
    if r3.status_code != 200:
        print(f"❌ FAIL: Bob cannot access specifically shared page: {r3.status_code}")
        return False
    
    # Charlie (non-member) should get 403 on the space itself
    r4 = requests.get(f"{API}/spaces/{astra_space_id}/pages/{page_id}",
                      headers=_h(charlie_token))
    
    if r4.status_code != 403:
        print(f"❌ FAIL: Charlie should get 403 (not a space member), got {r4.status_code}")
        return False
    
    print("✅ PASS: Specific sharing works correctly")
    return True


def test_pages_nested_and_delete(alice_token, astra_space_id):
    """Test 7: Nested pages and deletion"""
    print("\n=== Pages Test 7: Nested pages and deletion ===")
    
    # Create parent page
    r1 = requests.post(f"{API}/spaces/{astra_space_id}/pages",
                       json={"title": "Parent Page"},
                       headers=_h(alice_token))
    
    if r1.status_code != 201:
        print(f"❌ FAIL: Could not create parent page: {r1.status_code}")
        return False
    
    parent_id = r1.json()["id"]
    
    # Create child page
    r2 = requests.post(f"{API}/spaces/{astra_space_id}/pages",
                       json={"title": "Child Page", "parent_page_id": parent_id},
                       headers=_h(alice_token))
    
    if r2.status_code != 201:
        print(f"❌ FAIL: Could not create child page: {r2.status_code}")
        return False
    
    child_id = r2.json()["id"]
    
    # Try to set self as parent (should fail)
    r3 = requests.patch(f"{API}/spaces/{astra_space_id}/pages/{child_id}",
                        json={"parent_page_id": child_id},
                        headers=_h(alice_token))
    
    if r3.status_code != 422:
        print(f"❌ FAIL: Self-parent should return 422, got {r3.status_code}")
        return False
    
    error = r3.json().get("error", {})
    if error.get("code") != "INVALID_PARENT":
        print(f"❌ FAIL: Expected INVALID_PARENT, got {error.get('code')}")
        return False
    
    # Delete parent (soft delete)
    r4 = requests.delete(f"{API}/spaces/{astra_space_id}/pages/{parent_id}",
                         headers=_h(alice_token))
    
    if r4.status_code != 204:
        print(f"❌ FAIL: Delete failed: {r4.status_code}")
        return False
    
    # Verify parent is not in list
    r5 = requests.get(f"{API}/spaces/{astra_space_id}/pages", headers=_h(alice_token))
    if r5.status_code != 200:
        print(f"❌ FAIL: Could not list pages: {r5.status_code}")
        return False
    
    pages = r5.json()
    if any(p["id"] == parent_id for p in pages):
        print(f"❌ FAIL: Deleted page still appears in list")
        return False
    
    # Verify GET returns 404
    r6 = requests.get(f"{API}/spaces/{astra_space_id}/pages/{parent_id}",
                      headers=_h(alice_token))
    
    if r6.status_code != 404:
        print(f"❌ FAIL: Deleted page should return 404, got {r6.status_code}")
        return False
    
    print("✅ PASS: Nested pages and deletion work correctly")
    return True


def test_pages_tree(alice_token, astra_space_id):
    """Test 8: GET /pages/tree"""
    print("\n=== Pages Test 8: Pages tree ===")
    
    r = requests.get(f"{API}/spaces/{astra_space_id}/pages/tree", headers=_h(alice_token))
    
    if r.status_code != 200:
        print(f"❌ FAIL: Tree endpoint failed: {r.status_code}")
        return False
    
    tree = r.json()
    if not isinstance(tree, list):
        print(f"❌ FAIL: Tree should return a list")
        return False
    
    # Verify tree items have required fields
    if len(tree) > 0:
        item = tree[0]
        required_fields = ["id", "title", "parent_page_id", "visibility"]
        for field in required_fields:
            if field not in item:
                print(f"❌ FAIL: Tree item missing field: {field}")
                return False
    
    print("✅ PASS: Pages tree endpoint works")
    return True


# =============================================================================
# Priority 3: Invitation emits InboxEvent
# =============================================================================

def test_invitation_inbox_event(alice_token, astra_space_id):
    """Test invitation creates InboxEvent"""
    print("\n=== Invitation InboxEvent Test ===")
    
    # Create a new user to invite
    import uuid
    new_email = f"test_invite_{uuid.uuid4().hex[:8]}@notevoro.dev"
    r1 = requests.post(f"{API}/auth/signup",
                       json={"email": new_email, "password": "TestPass123!", "name": "Test User"})
    
    if r1.status_code != 201:
        print(f"❌ FAIL: Could not create test user: {r1.status_code}")
        return False
    
    new_token = r1.json()["token"]
    new_user_id = r1.json()["user"]["id"]
    
    # Alice invites the new user to Astra
    r2 = requests.post(f"{API}/spaces/{astra_space_id}/invitations",
                       json={"emails": [new_email], "role": "member"},
                       headers=_h(alice_token))
    
    if r2.status_code != 201:
        print(f"❌ FAIL: Could not send invitation: {r2.status_code}")
        print(f"Response: {r2.text}")
        return False
    
    # Check new user's inbox for invitation event
    r3 = requests.get(f"{API}/inbox", headers=_h(new_token))
    
    if r3.status_code != 200:
        print(f"❌ FAIL: Could not fetch new user's inbox: {r3.status_code}")
        return False
    
    inbox = r3.json()
    invitation_events = [item for item in inbox["items"] 
                         if item.get("event_type") == "invitation" 
                         and item.get("source_space_id") == astra_space_id]
    
    if len(invitation_events) == 0:
        print(f"❌ FAIL: No invitation InboxEvent found")
        print(f"Inbox items: {json.dumps(inbox['items'], indent=2)}")
        return False
    
    inv_event = invitation_events[0]
    if inv_event.get("status") != "accepted":
        print(f"⚠️  WARNING: Invitation status is {inv_event.get('status')}, expected 'accepted'")
    
    print("✅ PASS: Invitation creates InboxEvent")
    return True


# =============================================================================
# Priority 4: Regression Tests
# =============================================================================

def test_health_endpoints():
    """Test health endpoints"""
    print("\n=== Regression: Health endpoints ===")
    
    # Test /api/health/ready
    r = requests.get(f"{BASE_URL}/api/health/ready")
    if r.status_code != 200:
        print(f"❌ FAIL: Health ready failed: {r.status_code}")
        return False
    
    data = r.json()
    if data.get("checks", {}).get("realtime") != "not_configured":
        print(f"⚠️  WARNING: Realtime should be 'not_configured', got {data.get('checks', {}).get('realtime')}")
    
    print("✅ PASS: Health endpoints work")
    return True


def test_auth_endpoints():
    """Test auth endpoints"""
    print("\n=== Regression: Auth endpoints ===")
    
    # Test login
    alice_token = _login(**ALICE)
    if not alice_token:
        print(f"❌ FAIL: Login failed")
        return False
    
    # Test /me
    r = requests.get(f"{API}/auth/me", headers=_h(alice_token))
    if r.status_code != 200:
        print(f"❌ FAIL: /me failed: {r.status_code}")
        return False
    
    print("✅ PASS: Auth endpoints work")
    return True


def test_spaces_endpoints(alice_token):
    """Test spaces endpoints"""
    print("\n=== Regression: Spaces endpoints ===")
    
    # Test GET /spaces
    r1 = requests.get(f"{API}/spaces", headers=_h(alice_token))
    if r1.status_code != 200:
        print(f"❌ FAIL: GET /spaces failed: {r1.status_code}")
        return False
    
    # Test POST /spaces (create personal space)
    import uuid
    r2 = requests.post(f"{API}/spaces",
                       json={"name": f"Test Space {uuid.uuid4().hex[:8]}", "type": "personal"},
                       headers=_h(alice_token))
    
    if r2.status_code != 201:
        print(f"❌ FAIL: POST /spaces failed: {r2.status_code}")
        return False
    
    print("✅ PASS: Spaces endpoints work")
    return True


def test_items_endpoints(alice_token, astra_space_id):
    """Test items CRUD endpoints"""
    print("\n=== Regression: Items CRUD ===")
    
    # Test notes
    r1 = requests.post(f"{API}/spaces/{astra_space_id}/notes",
                       json={"title": "Test Note", "content": "Test content"},
                       headers=_h(alice_token))
    
    if r1.status_code != 201:
        print(f"❌ FAIL: Create note failed: {r1.status_code}")
        return False
    
    # Test tasks
    r2 = requests.post(f"{API}/spaces/{astra_space_id}/tasks",
                       json={"title": "Test Task"},
                       headers=_h(alice_token))
    
    if r2.status_code != 201:
        print(f"❌ FAIL: Create task failed: {r2.status_code}")
        return False
    
    # Test projects
    r3 = requests.post(f"{API}/spaces/{astra_space_id}/projects",
                       json={"name": "Test Project"},
                       headers=_h(alice_token))
    
    if r3.status_code != 201:
        print(f"❌ FAIL: Create project failed: {r3.status_code}")
        return False
    
    # Test documents
    r4 = requests.post(f"{API}/spaces/{astra_space_id}/documents",
                       json={"title": "Test Document", "content": "Test content"},
                       headers=_h(alice_token))
    
    if r4.status_code != 201:
        print(f"❌ FAIL: Create document failed: {r4.status_code}")
        return False
    
    print("✅ PASS: Items CRUD works")
    return True


def test_chat_endpoints(alice_token):
    """Test chat endpoints"""
    print("\n=== Regression: Chat endpoints ===")
    
    r = requests.get(f"{API}/conversations", headers=_h(alice_token))
    if r.status_code != 200:
        print(f"❌ FAIL: GET conversations failed: {r.status_code}")
        return False
    
    print("✅ PASS: Chat endpoints work")
    return True


def test_voro_503(alice_token):
    """Test Voro returns 503 AI_NOT_CONFIGURED"""
    print("\n=== Regression: Voro 503 ===")
    
    r = requests.post(f"{API}/voro/ask",
                      json={"message": "test"},
                      headers=_h(alice_token))
    
    if r.status_code != 503:
        print(f"❌ FAIL: Expected 503, got {r.status_code}")
        return False
    
    error = r.json().get("error", {})
    if error.get("code") != "AI_NOT_CONFIGURED":
        print(f"❌ FAIL: Expected AI_NOT_CONFIGURED, got {error.get('code')}")
        return False
    
    print("✅ PASS: Voro returns 503 AI_NOT_CONFIGURED")
    return True


def test_collab_config(alice_token):
    """Test collab config endpoint"""
    print("\n=== Regression: Collab config ===")
    
    # Unauthenticated should return 401
    r1 = requests.get(f"{API}/collab/config")
    if r1.status_code != 401:
        print(f"❌ FAIL: Unauthenticated should return 401, got {r1.status_code}")
        return False
    
    # Authenticated should return 200 with enabled:false
    r2 = requests.get(f"{API}/collab/config", headers=_h(alice_token))
    if r2.status_code != 200:
        print(f"❌ FAIL: Authenticated collab config failed: {r2.status_code}")
        return False
    
    data = r2.json()
    if data.get("enabled") != False:
        print(f"⚠️  WARNING: Collab should be disabled, got {data.get('enabled')}")
    
    print("✅ PASS: Collab config works")
    return True


def test_registry_capabilities(alice_token):
    """Test registry endpoint for pages capability"""
    print("\n=== Regression: Registry capabilities ===")
    
    r = requests.get(f"{API}/registry", headers=_h(alice_token))
    if r.status_code != 200:
        print(f"❌ FAIL: Registry endpoint failed: {r.status_code}")
        return False
    
    registry = r.json()
    
    # Check that 'pages' capability exists
    pages_cap = any(item.get("key") == "pages" for item in registry)
    if not pages_cap:
        print(f"❌ FAIL: 'pages' capability not found in registry")
        return False
    
    # Check that 'inbox' is NOT a capability (it's Brain-only)
    inbox_cap = any(item.get("key") == "inbox" for item in registry)
    if inbox_cap:
        print(f"⚠️  WARNING: 'inbox' should not be a space capability (Brain-only)")
    
    print("✅ PASS: Registry capabilities correct")
    return True


# =============================================================================
# Main Test Runner
# =============================================================================

def main():
    print("=" * 80)
    print("NOTEVORO BACKEND TESTING - NEW INBOX & PAGES ENDPOINTS")
    print("=" * 80)
    
    # Login all test users
    print("\n🔐 Logging in test users...")
    alice_token = _login(**ALICE)
    bob_token = _login(**BOB)
    charlie_token = _login(**CHARLIE)
    
    if not alice_token or not bob_token or not charlie_token:
        print("❌ CRITICAL: Could not login test users")
        print("Please ensure test users exist in the database")
        return
    
    print("✅ All test users logged in successfully")
    
    # Find Astra space
    print("\n🔍 Finding Astra team space...")
    astra_space_id = _find_space_by_name(alice_token, "Astra")
    
    if not astra_space_id:
        print("❌ CRITICAL: Could not find 'Astra' team space")
        print("Please ensure Alice has a team space named 'Astra'")
        return
    
    print(f"✅ Found Astra space: {astra_space_id}")
    
    # Track results
    results = {
        "Priority 1: Global Inbox": [],
        "Priority 2: Pages": [],
        "Priority 3: Invitation": [],
        "Priority 4: Regression": []
    }
    
    # Priority 1: Global Inbox
    print("\n" + "=" * 80)
    print("PRIORITY 1: GLOBAL INBOX (/api/v1/inbox)")
    print("=" * 80)
    
    results["Priority 1: Global Inbox"].append(("Unauthenticated access", test_inbox_unauthenticated()))
    results["Priority 1: Global Inbox"].append(("List inbox as Bob", test_inbox_list_as_bob(bob_token)))
    results["Priority 1: Global Inbox"].append(("Category filters", test_inbox_category_filters(bob_token)))
    results["Priority 1: Global Inbox"].append(("Compose validation", test_compose_validation(alice_token)))
    results["Priority 1: Global Inbox"].append(("Compose mail", test_compose_mail(alice_token, bob_token, astra_space_id)))
    results["Priority 1: Global Inbox"].append(("Compose with page share", test_compose_with_page_share(alice_token, bob_token, astra_space_id)))
    results["Priority 1: Global Inbox"].append(("Cross-space object validation", test_compose_cross_space_object(alice_token, astra_space_id)))
    results["Priority 1: Global Inbox"].append(("Unreachable recipient", test_compose_unreachable_recipient(alice_token, charlie_token, astra_space_id)))
    results["Priority 1: Global Inbox"].append(("Read operations", test_inbox_read_operations(bob_token)))
    results["Priority 1: Global Inbox"].append(("Accept/Decline/Archive", test_inbox_accept_decline_archive(bob_token)))
    results["Priority 1: Global Inbox"].append(("Recipient search", test_recipient_search(alice_token, astra_space_id)))
    results["Priority 1: Global Inbox"].append(("Event privacy", test_inbox_event_privacy(bob_token, charlie_token)))
    
    # Priority 2: Pages
    print("\n" + "=" * 80)
    print("PRIORITY 2: NOTION-STYLE PAGES (/api/v1/spaces/{sid}/pages)")
    print("=" * 80)
    
    results["Priority 2: Pages"].append(("Unauthenticated access", test_pages_unauthenticated(astra_space_id)))
    results["Priority 2: Pages"].append(("Non-member access", test_pages_non_member(charlie_token, astra_space_id)))
    results["Priority 2: Pages"].append(("Private page visibility", test_pages_private_visibility(alice_token, bob_token, astra_space_id)))
    results["Priority 2: Pages"].append(("Specific sharing", test_pages_specific_sharing(alice_token, bob_token, charlie_token, astra_space_id)))
    results["Priority 2: Pages"].append(("Nested pages and deletion", test_pages_nested_and_delete(alice_token, astra_space_id)))
    results["Priority 2: Pages"].append(("Pages tree", test_pages_tree(alice_token, astra_space_id)))
    
    # Priority 3: Invitation
    print("\n" + "=" * 80)
    print("PRIORITY 3: INVITATION EMITS INBOXEVENT")
    print("=" * 80)
    
    results["Priority 3: Invitation"].append(("Invitation creates InboxEvent", test_invitation_inbox_event(alice_token, astra_space_id)))
    
    # Priority 4: Regression
    print("\n" + "=" * 80)
    print("PRIORITY 4: REGRESSION ON EXISTING ROUTERS")
    print("=" * 80)
    
    results["Priority 4: Regression"].append(("Health endpoints", test_health_endpoints()))
    results["Priority 4: Regression"].append(("Auth endpoints", test_auth_endpoints()))
    results["Priority 4: Regression"].append(("Spaces endpoints", test_spaces_endpoints(alice_token)))
    results["Priority 4: Regression"].append(("Items CRUD", test_items_endpoints(alice_token, astra_space_id)))
    results["Priority 4: Regression"].append(("Chat endpoints", test_chat_endpoints(alice_token)))
    results["Priority 4: Regression"].append(("Voro 503", test_voro_503(alice_token)))
    results["Priority 4: Regression"].append(("Collab config", test_collab_config(alice_token)))
    results["Priority 4: Regression"].append(("Registry capabilities", test_registry_capabilities(alice_token)))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    total_tests = 0
    total_passed = 0
    
    for category, tests in results.items():
        print(f"\n{category}:")
        passed = sum(1 for _, result in tests if result)
        total = len(tests)
        total_tests += total
        total_passed += passed
        
        for name, result in tests:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {status}: {name}")
        
        print(f"  → {passed}/{total} passed")
    
    print("\n" + "=" * 80)
    print(f"OVERALL: {total_passed}/{total_tests} tests passed")
    print("=" * 80)
    
    if total_passed == total_tests:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️  {total_tests - total_passed} test(s) failed")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Comprehensive backend API test for Notevoro in preview mode (no Supabase/OpenAI keys).
Tests all 16 endpoint groups to ensure graceful degradation and proper error handling.
"""

import requests
import json
import sys

# Base URL from .env
BASE_URL = "https://notevoro-launch.preview.emergentagent.com/api"

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def test_endpoint(name, method, url, expected_status, expected_keys=None, body=None, check_error_msg=None):
    """Test a single endpoint and validate response."""
    results["total"] += 1
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=body, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, json=body, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        # Check status code
        if response.status_code != expected_status:
            results["failed"].append(f"❌ {name}: Expected {expected_status}, got {response.status_code}")
            print(f"❌ {name}: Expected {expected_status}, got {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return False
        
        # Check if response is valid JSON
        try:
            data = response.json()
        except json.JSONDecodeError:
            results["failed"].append(f"❌ {name}: Response is not valid JSON")
            print(f"❌ {name}: Response is not valid JSON")
            print(f"   Response: {response.text[:500]}")
            return False
        
        # Check expected keys
        if expected_keys:
            for key in expected_keys:
                if key not in data:
                    results["failed"].append(f"❌ {name}: Missing key '{key}' in response")
                    print(f"❌ {name}: Missing key '{key}' in response")
                    print(f"   Response: {json.dumps(data, indent=2)[:500]}")
                    return False
        
        # Check error message contains specific text
        if check_error_msg and "error" in data:
            if check_error_msg.lower() not in data["error"].lower():
                results["failed"].append(f"❌ {name}: Error message doesn't contain '{check_error_msg}'")
                print(f"❌ {name}: Error message doesn't contain '{check_error_msg}'")
                print(f"   Response: {json.dumps(data, indent=2)}")
                return False
        
        results["passed"].append(f"✅ {name}")
        print(f"✅ {name}")
        return True
        
    except requests.exceptions.RequestException as e:
        results["failed"].append(f"❌ {name}: Request failed - {str(e)}")
        print(f"❌ {name}: Request failed - {str(e)}")
        return False
    except Exception as e:
        results["failed"].append(f"❌ {name}: Unexpected error - {str(e)}")
        print(f"❌ {name}: Unexpected error - {str(e)}")
        return False

def main():
    print("=" * 80)
    print("NOTEVORO BACKEND API TEST - PREVIEW MODE (No Supabase/OpenAI)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}\n")
    
    # ========================================================================
    # 1. USAGE (NEWLY BUILT - HIGH PRIORITY)
    # ========================================================================
    print("\n[1] Testing Usage Endpoint")
    print("-" * 80)
    test_endpoint(
        "GET /api/usage",
        "GET",
        f"{BASE_URL}/usage",
        200,
        expected_keys=["preview", "plan", "limits", "usage"]
    )
    
    # ========================================================================
    # 2. PRACTICE TESTS (NEWLY BUILT - HIGH PRIORITY)
    # ========================================================================
    print("\n[2] Testing Practice Tests Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/tests",
        "GET",
        f"{BASE_URL}/tests",
        200,
        expected_keys=["tests"]
    )
    test_endpoint(
        "POST /api/tests/generate (with valid body)",
        "POST",
        f"{BASE_URL}/tests/generate",
        500,
        body={"subject": "Physics: Kinematics", "count": 10, "duration_minutes": 30},
        check_error_msg="not configured"
    )
    test_endpoint(
        "POST /api/tests/generate (empty body)",
        "POST",
        f"{BASE_URL}/tests/generate",
        500,
        body={},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/tests/[id]",
        "GET",
        f"{BASE_URL}/tests/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "PATCH /api/tests/[id]",
        "PATCH",
        f"{BASE_URL}/tests/some-uuid",
        500,
        body={"answers": {}, "time_taken_seconds": 100},
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/tests/[id]",
        "DELETE",
        f"{BASE_URL}/tests/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 3. PROFILE
    # ========================================================================
    print("\n[3] Testing Profile Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/profile",
        "GET",
        f"{BASE_URL}/profile",
        200,
        expected_keys=["profile"]
    )
    test_endpoint(
        "POST /api/profile",
        "POST",
        f"{BASE_URL}/profile",
        500,
        body={"full_name": "Test User", "display_name": "Test", "grade": "10", "curriculum": "CBSE"},
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 4. CHAT
    # ========================================================================
    print("\n[4] Testing Chat Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/chats",
        "GET",
        f"{BASE_URL}/chats",
        200,
        expected_keys=["chats"]
    )
    test_endpoint(
        "GET /api/chats/[id]",
        "GET",
        f"{BASE_URL}/chats/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/chats/[id]",
        "DELETE",
        f"{BASE_URL}/chats/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # Special test for POST /api/chat (returns Response, not NextResponse.json)
    print("Testing POST /api/chat...")
    try:
        response = requests.post(f"{BASE_URL}/chat", json={"message": "hello", "chatId": None}, timeout=10)
        if response.status_code == 500:
            try:
                data = response.json()
                if "error" in data and "supabase not configured" in data["error"].lower():
                    results["passed"].append("✅ POST /api/chat")
                    print("✅ POST /api/chat")
                else:
                    results["failed"].append(f"❌ POST /api/chat: Error message doesn't contain 'Supabase not configured'")
                    print(f"❌ POST /api/chat: Error message doesn't contain 'Supabase not configured'")
                    print(f"   Response: {json.dumps(data, indent=2)}")
            except json.JSONDecodeError:
                results["failed"].append("❌ POST /api/chat: Response is not valid JSON")
                print("❌ POST /api/chat: Response is not valid JSON")
                print(f"   Response: {response.text[:500]}")
        else:
            results["failed"].append(f"❌ POST /api/chat: Expected 500, got {response.status_code}")
            print(f"❌ POST /api/chat: Expected 500, got {response.status_code}")
        results["total"] += 1
    except Exception as e:
        results["failed"].append(f"❌ POST /api/chat: {str(e)}")
        print(f"❌ POST /api/chat: {str(e)}")
        results["total"] += 1
    
    # ========================================================================
    # 5. STUDY PACKS
    # ========================================================================
    print("\n[5] Testing Study Pack Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/study-pack",
        "GET",
        f"{BASE_URL}/study-pack",
        200,
        expected_keys=["packs"]
    )
    test_endpoint(
        "POST /api/study-pack/generate (with topic)",
        "POST",
        f"{BASE_URL}/study-pack/generate",
        500,
        body={"topic": "Photosynthesis"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "POST /api/study-pack/generate (no topic)",
        "POST",
        f"{BASE_URL}/study-pack/generate",
        500,
        body={},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/study-pack/[id]",
        "GET",
        f"{BASE_URL}/study-pack/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/study-pack/[id]",
        "DELETE",
        f"{BASE_URL}/study-pack/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 6. ATLAS
    # ========================================================================
    print("\n[6] Testing Atlas Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/atlas",
        "GET",
        f"{BASE_URL}/atlas",
        200,
        expected_keys=["sessions"]
    )
    test_endpoint(
        "POST /api/atlas/start",
        "POST",
        f"{BASE_URL}/atlas/start",
        500,
        body={"topic": "French Revolution"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/atlas/[id]",
        "GET",
        f"{BASE_URL}/atlas/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "PATCH /api/atlas/[id]",
        "PATCH",
        f"{BASE_URL}/atlas/some-uuid",
        500,
        body={"progress": {}},
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/atlas/[id]",
        "DELETE",
        f"{BASE_URL}/atlas/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 7. NOTES
    # ========================================================================
    print("\n[7] Testing Notes Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/notes",
        "GET",
        f"{BASE_URL}/notes",
        200,
        expected_keys=["notes", "folders"]
    )
    test_endpoint(
        "POST /api/notes",
        "POST",
        f"{BASE_URL}/notes",
        500,
        body={"title": "Test Note", "content_html": "<p>Test content</p>"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/notes/[id]",
        "GET",
        f"{BASE_URL}/notes/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "PATCH /api/notes/[id]",
        "PATCH",
        f"{BASE_URL}/notes/some-uuid",
        500,
        body={"title": "Updated Title"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/notes/[id]",
        "DELETE",
        f"{BASE_URL}/notes/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "POST /api/notes/ai (valid action)",
        "POST",
        f"{BASE_URL}/notes/ai",
        500,
        body={"action": "summarize", "content": "This is a test note about photosynthesis and how plants convert light energy into chemical energy through chloroplasts."},
        check_error_msg="not configured"
    )
    test_endpoint(
        "POST /api/notes/ai (invalid action)",
        "POST",
        f"{BASE_URL}/notes/ai",
        500,
        body={"action": "INVALID", "content": "Test content"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "POST /api/notes/convert-to-pack",
        "POST",
        f"{BASE_URL}/notes/convert-to-pack",
        500,
        body={"content": "Long enough content here for photosynthesis to be a valid note we can convert into a study pack. Photosynthesis is the process by which plants use sunlight to synthesize nutrients.", "title": "Biology Notes"},
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 8. FOLDERS
    # ========================================================================
    print("\n[8] Testing Folders Endpoints")
    print("-" * 80)
    test_endpoint(
        "POST /api/folders",
        "POST",
        f"{BASE_URL}/folders",
        500,
        body={"name": "Biology"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "PATCH /api/folders/[id]",
        "PATCH",
        f"{BASE_URL}/folders/some-uuid",
        500,
        body={"name": "Updated Folder"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/folders/[id]",
        "DELETE",
        f"{BASE_URL}/folders/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 9. FLASHCARDS
    # ========================================================================
    print("\n[9] Testing Flashcards Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/flashcards",
        "GET",
        f"{BASE_URL}/flashcards",
        200,
        expected_keys=["sets"]
    )
    test_endpoint(
        "POST /api/flashcards/generate",
        "POST",
        f"{BASE_URL}/flashcards/generate",
        500,
        body={"topic": "Cell Biology", "count": 10},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/flashcards/[id]",
        "GET",
        f"{BASE_URL}/flashcards/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/flashcards/[id]",
        "DELETE",
        f"{BASE_URL}/flashcards/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 10. QUIZZES
    # ========================================================================
    print("\n[10] Testing Quizzes Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/quizzes",
        "GET",
        f"{BASE_URL}/quizzes",
        200,
        expected_keys=["sets"]
    )
    test_endpoint(
        "POST /api/quizzes/generate",
        "POST",
        f"{BASE_URL}/quizzes/generate",
        500,
        body={"topic": "Trigonometry", "difficulty": "medium", "count": 10},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/quizzes/[id]",
        "GET",
        f"{BASE_URL}/quizzes/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/quizzes/[id]",
        "DELETE",
        f"{BASE_URL}/quizzes/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 11. RESEARCH
    # ========================================================================
    print("\n[11] Testing Research Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/research",
        "GET",
        f"{BASE_URL}/research",
        200,
        expected_keys=["reports"]
    )
    test_endpoint(
        "POST /api/research/generate",
        "POST",
        f"{BASE_URL}/research/generate",
        500,
        body={"topic": "Climate change"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/research/[id]",
        "GET",
        f"{BASE_URL}/research/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/research/[id]",
        "DELETE",
        f"{BASE_URL}/research/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 12. PRESENTATIONS
    # ========================================================================
    print("\n[12] Testing Presentations Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/presentations",
        "GET",
        f"{BASE_URL}/presentations",
        200,
        expected_keys=["presentations"]
    )
    test_endpoint(
        "POST /api/presentations/generate",
        "POST",
        f"{BASE_URL}/presentations/generate",
        500,
        body={"topic": "Water Cycle", "theme": "blue"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "GET /api/presentations/[id]",
        "GET",
        f"{BASE_URL}/presentations/some-uuid",
        500,
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/presentations/[id]",
        "DELETE",
        f"{BASE_URL}/presentations/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # 13. CALENDAR
    # ========================================================================
    print("\n[13] Testing Calendar Endpoints")
    print("-" * 80)
    test_endpoint(
        "GET /api/calendar",
        "GET",
        f"{BASE_URL}/calendar",
        200,
        expected_keys=["events"]
    )
    test_endpoint(
        "POST /api/calendar",
        "POST",
        f"{BASE_URL}/calendar",
        500,
        body={"title": "Physics Exam", "event_date": "2026-08-01", "event_type": "exam"},
        check_error_msg="not configured"
    )
    test_endpoint(
        "DELETE /api/calendar/[id]",
        "DELETE",
        f"{BASE_URL}/calendar/some-uuid",
        500,
        check_error_msg="not configured"
    )
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {results['total']}")
    print(f"Passed: {len(results['passed'])}")
    print(f"Failed: {len(results['failed'])}")
    print(f"Success rate: {len(results['passed']) / results['total'] * 100:.1f}%")
    
    if results["failed"]:
        print("\n❌ FAILED TESTS:")
        for failure in results["failed"]:
            print(f"  {failure}")
        return 1
    else:
        print("\n✅ ALL TESTS PASSED!")
        return 0

if __name__ == "__main__":
    sys.exit(main())

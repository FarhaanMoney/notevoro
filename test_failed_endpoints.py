#!/usr/bin/env python3
"""
Re-test the 4 failed endpoints to verify they work after server restart.
"""

import requests
import json

BASE_URL = "https://notevoro-launch.preview.emergentagent.com/api"

def test_endpoint(name, method, url, body=None):
    """Test a single endpoint."""
    try:
        if method == "POST":
            response = requests.post(url, json=body, timeout=15)
        elif method == "DELETE":
            response = requests.delete(url, timeout=15)
        
        print(f"\n{name}")
        print(f"  Status: {response.status_code}")
        
        try:
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2)}")
            
            if response.status_code == 500 and "error" in data:
                if "not configured" in data["error"].lower():
                    print(f"  ✅ PASS - Returns 500 with 'Not configured' error")
                    return True
                else:
                    print(f"  ⚠️  Returns 500 but error message doesn't contain 'not configured'")
                    return False
            else:
                print(f"  ❌ FAIL - Expected 500 with error, got {response.status_code}")
                return False
        except json.JSONDecodeError:
            print(f"  ❌ FAIL - Response is not valid JSON")
            print(f"  Response text: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"  ❌ FAIL - Exception: {str(e)}")
        return False

print("=" * 80)
print("RE-TESTING FAILED ENDPOINTS")
print("=" * 80)

results = []

results.append(test_endpoint(
    "DELETE /api/notes/[id]",
    "DELETE",
    f"{BASE_URL}/notes/some-uuid"
))

results.append(test_endpoint(
    "POST /api/notes/ai (valid action)",
    "POST",
    f"{BASE_URL}/notes/ai",
    {"action": "summarize", "content": "This is a test note about photosynthesis and how plants convert light energy into chemical energy through chloroplasts."}
))

results.append(test_endpoint(
    "POST /api/notes/ai (invalid action)",
    "POST",
    f"{BASE_URL}/notes/ai",
    {"action": "INVALID", "content": "Test content"}
))

results.append(test_endpoint(
    "POST /api/notes/convert-to-pack",
    "POST",
    f"{BASE_URL}/notes/convert-to-pack",
    {"content": "Long enough content here for photosynthesis to be a valid note we can convert into a study pack. Photosynthesis is the process by which plants use sunlight to synthesize nutrients.", "title": "Biology Notes"}
))

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
passed = sum(results)
total = len(results)
print(f"Passed: {passed}/{total}")
if passed == total:
    print("✅ ALL TESTS PASSED!")
else:
    print(f"❌ {total - passed} tests still failing")

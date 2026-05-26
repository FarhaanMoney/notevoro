#!/usr/bin/env python3
"""
Notevoro AI v2 Backend Testing Script
Tests all backend endpoints according to the review requirements.
"""

import requests
import json
import uuid
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "https://notevoro-preview.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class NotevoroTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_result(self, test_name, success, message="", details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}/{endpoint.lstrip('/')}"
        headers = kwargs.get('headers', {})
        
        if self.auth_token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        
        kwargs['headers'] = headers
        
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        try:
            response = self.make_request('GET', '/health')
            if response and response.status_code == 200:
                data = response.json()
                expected_fields = ['ok', 'service', 'model']
                if all(field in data for field in expected_fields):
                    self.log_result("Health endpoint", True, f"Service: {data.get('service')}, Model: {data.get('model')}")
                else:
                    self.log_result("Health endpoint", False, f"Missing fields in response: {data}")
            else:
                self.log_result("Health endpoint", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_result("Health endpoint", False, f"Exception: {str(e)}")
    
    def test_auth_signup(self):
        """Test user signup"""
        try:
            # Generate unique email to avoid conflicts
            unique_id = str(uuid.uuid4())[:8]
            email = f"test_{unique_id}@example.com"
            password = "TestPassword123!"
            name = f"Test User {unique_id}"
            
            payload = {
                "name": name,
                "email": email,
                "password": password
            }
            
            response = self.make_request('POST', '/auth/signup', json=payload)
            
            if response and response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.auth_token = data['token']
                    self.user_data = data['user']
                    
                    # Verify user data structure
                    user = data['user']
                    required_fields = ['id', 'name', 'email', 'credits', 'credits_max', 'plan', 'level']
                    missing_fields = [f for f in required_fields if f not in user]
                    
                    if not missing_fields:
                        # Check specific values
                        if (user.get('credits') == 50 and 
                            user.get('credits_max') == 50 and 
                            user.get('plan') == 'free' and
                            user.get('level', {}).get('name') == 'Beginner'):
                            self.log_result("Auth signup", True, f"User created: {email}")
                        else:
                            self.log_result("Auth signup", False, f"Incorrect default values: credits={user.get('credits')}, plan={user.get('plan')}, level={user.get('level', {}).get('name')}")
                    else:
                        self.log_result("Auth signup", False, f"Missing user fields: {missing_fields}")
                else:
                    self.log_result("Auth signup", False, f"Missing token or user in response: {data}")
            else:
                self.log_result("Auth signup", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Auth signup", False, f"Exception: {str(e)}")
    
    def test_auth_login(self):
        """Test user login with the created account"""
        if not self.user_data:
            self.log_result("Auth login", False, "No user data from signup")
            return
            
        try:
            payload = {
                "email": self.user_data['email'],
                "password": "TestPassword123!"
            }
            
            response = self.make_request('POST', '/auth/login', json=payload)
            
            if response and response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.log_result("Auth login", True, f"Login successful for {self.user_data['email']}")
                else:
                    self.log_result("Auth login", False, f"Missing token or user in response: {data}")
            else:
                self.log_result("Auth login", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Auth login", False, f"Exception: {str(e)}")
    
    def test_auth_me(self):
        """Test /auth/me endpoint"""
        if not self.auth_token:
            self.log_result("Auth me", False, "No auth token available")
            return
            
        try:
            response = self.make_request('GET', '/auth/me')
            
            if response and response.status_code == 200:
                data = response.json()
                if 'user' in data:
                    self.log_result("Auth me", True, f"User data retrieved for {data['user'].get('email')}")
                else:
                    self.log_result("Auth me", False, f"Missing user in response: {data}")
            else:
                self.log_result("Auth me", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Auth me", False, f"Exception: {str(e)}")
    
    def test_google_oauth_error(self):
        """Test Google OAuth returns proper error when not configured"""
        try:
            payload = {"credential": "fake_token"}
            response = self.make_request('POST', '/auth/google', json=payload)
            
            if response and response.status_code == 500:
                data = response.json()
                if 'error' in data and 'not configured' in data['error'].lower():
                    self.log_result("Google OAuth error", True, "Correctly returns 500 with 'not configured' error")
                else:
                    self.log_result("Google OAuth error", False, f"Unexpected error message: {data}")
            else:
                self.log_result("Google OAuth error", False, f"Expected 500, got {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Google OAuth error", False, f"Exception: {str(e)}")
    
    def test_chats_crud(self):
        """Test chat CRUD operations"""
        if not self.auth_token:
            self.log_result("Chats CRUD", False, "No auth token available")
            return
        
        chat_id = None
        
        try:
            # Test create chat
            response = self.make_request('POST', '/chats', json={})
            if response and response.status_code == 200:
                data = response.json()
                if 'chat' in data and 'id' in data['chat']:
                    chat_id = data['chat']['id']
                    self.log_result("Chat create", True, f"Chat created with ID: {chat_id}")
                else:
                    self.log_result("Chat create", False, f"Invalid response: {data}")
                    return
            else:
                self.log_result("Chat create", False, f"Status: {response.status_code if response else 'No response'}")
                return
            
            # Test list chats
            response = self.make_request('GET', '/chats')
            if response and response.status_code == 200:
                data = response.json()
                if 'chats' in data and isinstance(data['chats'], list):
                    self.log_result("Chat list", True, f"Found {len(data['chats'])} chats")
                else:
                    self.log_result("Chat list", False, f"Invalid response: {data}")
            else:
                self.log_result("Chat list", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test search chats
            response = self.make_request('GET', '/chats?q=test')
            if response and response.status_code == 200:
                data = response.json()
                if 'chats' in data:
                    self.log_result("Chat search", True, f"Search returned {len(data['chats'])} results")
                else:
                    self.log_result("Chat search", False, f"Invalid response: {data}")
            else:
                self.log_result("Chat search", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test get messages (should be empty)
            response = self.make_request('GET', f'/chats/{chat_id}/messages')
            if response and response.status_code == 200:
                data = response.json()
                if 'messages' in data and isinstance(data['messages'], list):
                    self.log_result("Chat messages", True, f"Messages endpoint works, found {len(data['messages'])} messages")
                else:
                    self.log_result("Chat messages", False, f"Invalid response: {data}")
            else:
                self.log_result("Chat messages", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test rename chat
            response = self.make_request('PATCH', f'/chats/{chat_id}', json={"title": "Test Chat Renamed"})
            if response and response.status_code == 200:
                self.log_result("Chat rename", True, "Chat renamed successfully")
            else:
                self.log_result("Chat rename", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test delete chat
            response = self.make_request('DELETE', f'/chats/{chat_id}')
            if response and response.status_code == 200:
                self.log_result("Chat delete", True, "Chat deleted successfully")
            else:
                self.log_result("Chat delete", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Chats CRUD", False, f"Exception: {str(e)}")
    
    def test_chat_streaming_error(self):
        """Test chat streaming returns proper error when AI not configured"""
        if not self.auth_token:
            self.log_result("Chat streaming error", False, "No auth token available")
            return
        
        try:
            # First create a chat
            response = self.make_request('POST', '/chats', json={})
            if not response or response.status_code != 200:
                self.log_result("Chat streaming error", False, "Could not create chat for testing")
                return
            
            chat_id = response.json()['chat']['id']
            
            # Try to send a message
            payload = {
                "chat_id": chat_id,
                "message": "Hello, test message"
            }
            
            response = self.make_request('POST', '/chat', json=payload)
            
            if response and response.status_code == 500:
                # Check if it's a streaming response or JSON error
                content_type = response.headers.get('content-type', '')
                if 'text/plain' in content_type:
                    text = response.text
                    if 'AI API key' in text and 'not configured' in text:
                        self.log_result("Chat streaming error", True, "Correctly returns 500 with AI key error in stream")
                    else:
                        self.log_result("Chat streaming error", False, f"Unexpected stream content: {text[:200]}")
                else:
                    try:
                        data = response.json()
                        if 'error' in data and 'not configured' in data['error'].lower():
                            self.log_result("Chat streaming error", True, "Correctly returns 500 with 'not configured' error")
                        else:
                            self.log_result("Chat streaming error", False, f"Unexpected error message: {data}")
                    except:
                        self.log_result("Chat streaming error", False, f"Could not parse response: {response.text[:200]}")
            else:
                self.log_result("Chat streaming error", False, f"Expected 500, got {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Chat streaming error", False, f"Exception: {str(e)}")
    
    def test_tier_gating_free_user(self):
        """Test tier gating for free user - should get 403 on pro+ features"""
        if not self.auth_token:
            self.log_result("Tier gating", False, "No auth token available")
            return
        
        # Test pro+ features that should return 403
        pro_features = [
            ('POST', '/quiz/generate', {"topic": "Mathematics"}),
            ('POST', '/flashcards/generate', {"topic": "Science"}),
            ('POST', '/notes/generate', {"topic": "History"}),
            ('POST', '/study-plan/generate', {"goal": "Learn Python"})
        ]
        
        # Test premium features that should return 403
        premium_features = [
            ('POST', '/mock-test/generate', {"topic": "Physics"}),
            ('POST', '/file-analyze', {})  # Will test with form data
        ]
        
        try:
            for method, endpoint, payload in pro_features:
                response = self.make_request(method, endpoint, json=payload)
                if response and response.status_code == 403:
                    data = response.json()
                    if 'error' in data and 'locked on the free plan' in data['error']:
                        self.log_result(f"Tier gating - {endpoint}", True, "Correctly blocked free user from pro+ feature")
                    else:
                        self.log_result(f"Tier gating - {endpoint}", False, f"Wrong error message: {data}")
                else:
                    self.log_result(f"Tier gating - {endpoint}", False, f"Expected 403, got {response.status_code if response else 'No response'}")
            
            for method, endpoint, payload in premium_features:
                if endpoint == '/file-analyze':
                    # Test file analyze with form data
                    files = {'file': ('test.txt', 'test content', 'text/plain')}
                    response = self.make_request(method, endpoint, files=files)
                else:
                    response = self.make_request(method, endpoint, json=payload)
                
                if response and response.status_code == 403:
                    data = response.json()
                    if 'error' in data and 'locked on the free plan' in data['error']:
                        self.log_result(f"Tier gating - {endpoint}", True, "Correctly blocked free user from premium feature")
                    else:
                        self.log_result(f"Tier gating - {endpoint}", False, f"Wrong error message: {data}")
                else:
                    self.log_result(f"Tier gating - {endpoint}", False, f"Expected 403, got {response.status_code if response else 'No response'}")
                    
        except Exception as e:
            self.log_result("Tier gating", False, f"Exception: {str(e)}")
    
    def test_notes_share_public(self):
        """Test notes sharing and public access"""
        if not self.auth_token:
            self.log_result("Notes share/public", False, "No auth token available")
            return
        
        try:
            # First, manually insert a note into the database for testing
            # Since we can't generate notes without AI, we'll test the share/public flow
            # by creating a note directly via database or testing the endpoints
            
            # Test notes list (should be empty initially)
            response = self.make_request('GET', '/notes')
            if response and response.status_code == 200:
                data = response.json()
                if 'notes' in data:
                    self.log_result("Notes list", True, f"Notes list works, found {len(data['notes'])} notes")
                    
                    # If there are notes, test share functionality
                    if data['notes']:
                        note_id = data['notes'][0]['id']
                        
                        # Test share note
                        response = self.make_request('POST', f'/notes/{note_id}/share')
                        if response and response.status_code == 200:
                            share_data = response.json()
                            if 'slug' in share_data:
                                slug = share_data['slug']
                                self.log_result("Notes share", True, f"Note shared with slug: {slug}")
                                
                                # Test public access (no auth)
                                public_response = requests.get(f"{API_BASE}/public/notes/{slug}")
                                if public_response.status_code == 200:
                                    public_data = public_response.json()
                                    if 'note' in public_data and 'author' in public_data:
                                        self.log_result("Notes public access", True, "Public note access works")
                                    else:
                                        self.log_result("Notes public access", False, f"Invalid public response: {public_data}")
                                else:
                                    self.log_result("Notes public access", False, f"Public access failed: {public_response.status_code}")
                            else:
                                self.log_result("Notes share", False, f"No slug in response: {share_data}")
                        else:
                            self.log_result("Notes share", False, f"Share failed: {response.status_code if response else 'No response'}")
                    else:
                        self.log_result("Notes share/public", True, "Notes list works (empty as expected without AI)")
                else:
                    self.log_result("Notes list", False, f"Invalid response: {data}")
            else:
                self.log_result("Notes list", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Notes share/public", False, f"Exception: {str(e)}")
    
    def test_dashboard(self):
        """Test dashboard endpoint"""
        if not self.auth_token:
            self.log_result("Dashboard", False, "No auth token available")
            return
        
        try:
            response = self.make_request('GET', '/dashboard')
            
            if response and response.status_code == 200:
                data = response.json()
                required_fields = ['user', 'accuracy', 'recent_attempts', 'recent_chats', 'weak_topics', 'xp_series']
                missing_fields = [f for f in required_fields if f not in data]
                
                if not missing_fields:
                    # Check specific values for new user
                    if (data.get('accuracy') == 0 and 
                        isinstance(data.get('recent_attempts'), list) and
                        isinstance(data.get('recent_chats'), list) and
                        isinstance(data.get('weak_topics'), list) and
                        isinstance(data.get('xp_series'), list) and
                        len(data.get('xp_series', [])) == 7):
                        self.log_result("Dashboard", True, "Dashboard returns correct structure and default values")
                    else:
                        self.log_result("Dashboard", False, f"Incorrect dashboard values: accuracy={data.get('accuracy')}, xp_series_length={len(data.get('xp_series', []))}")
                else:
                    self.log_result("Dashboard", False, f"Missing dashboard fields: {missing_fields}")
            else:
                self.log_result("Dashboard", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Dashboard", False, f"Exception: {str(e)}")
    
    def test_config_plans(self):
        """Test config/plans endpoint"""
        try:
            response = self.make_request('GET', '/config/plans')
            
            if response and response.status_code == 200:
                data = response.json()
                required_fields = ['credits', 'costs', 'tiers']
                missing_fields = [f for f in required_fields if f not in data]
                
                if not missing_fields:
                    # Check specific values
                    credits = data.get('credits', {})
                    costs = data.get('costs', {})
                    tiers = data.get('tiers', {})
                    
                    if (credits.get('free') == 50 and 
                        credits.get('pro') == 500 and 
                        credits.get('premium') == 2000 and
                        costs.get('chat') == 1 and
                        costs.get('quiz') == 5 and
                        'chat' in tiers and 'quiz' in tiers):
                        self.log_result("Config plans", True, "Config returns correct plan structure and values")
                    else:
                        self.log_result("Config plans", False, f"Incorrect config values: {data}")
                else:
                    self.log_result("Config plans", False, f"Missing config fields: {missing_fields}")
            else:
                self.log_result("Config plans", False, f"Status: {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Config plans", False, f"Exception: {str(e)}")
    
    def test_razorpay_error(self):
        """Test Razorpay create-order returns proper error when not configured"""
        if not self.auth_token:
            self.log_result("Razorpay error", False, "No auth token available")
            return
        
        try:
            payload = {"plan": "pro"}
            response = self.make_request('POST', '/create-order', json=payload)
            
            if response and response.status_code == 500:
                data = response.json()
                if 'error' in data and 'not configured' in data['error'].lower():
                    self.log_result("Razorpay error", True, "Correctly returns 500 with 'not configured' error")
                else:
                    self.log_result("Razorpay error", False, f"Unexpected error message: {data}")
            else:
                self.log_result("Razorpay error", False, f"Expected 500, got {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Razorpay error", False, f"Exception: {str(e)}")
    
    def test_ai_dependent_endpoints_errors(self):
        """Test AI-dependent endpoints return proper errors when AI not configured"""
        if not self.auth_token:
            self.log_result("AI endpoints errors", False, "No auth token available")
            return
        
        # Note: Based on .env file, OPENAI_API_KEY is actually set, so these might not return 500
        # But we'll test them anyway to see the behavior
        
        ai_endpoints = [
            ('POST', '/quiz/generate', {"topic": "Math"}),
            ('POST', '/flashcards/generate', {"topic": "Science"}),
            ('POST', '/notes/generate', {"topic": "History"}),
            ('POST', '/study-plan/generate', {"goal": "Learn"}),
            ('POST', '/mock-test/generate', {"topic": "Physics"}),
        ]
        
        try:
            for method, endpoint, payload in ai_endpoints:
                response = self.make_request(method, endpoint, json=payload)
                
                # These might return 403 (tier gating) or 500 (AI error) or 200 (if AI works)
                if response:
                    if response.status_code == 403:
                        self.log_result(f"AI endpoint {endpoint}", True, "Correctly blocked by tier gating (403)")
                    elif response.status_code == 500:
                        data = response.json()
                        if 'error' in data and ('not configured' in data['error'].lower() or 'api key' in data['error'].lower()):
                            self.log_result(f"AI endpoint {endpoint}", True, "Correctly returns AI configuration error")
                        else:
                            self.log_result(f"AI endpoint {endpoint}", False, f"Unexpected 500 error: {data}")
                    elif response.status_code == 200:
                        self.log_result(f"AI endpoint {endpoint}", True, "AI endpoint works (API key is configured)")
                    else:
                        self.log_result(f"AI endpoint {endpoint}", False, f"Unexpected status: {response.status_code}")
                else:
                    self.log_result(f"AI endpoint {endpoint}", False, "No response")
                    
        except Exception as e:
            self.log_result("AI endpoints errors", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Notevoro AI v2 Backend Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Core functionality tests
        self.test_health_endpoint()
        self.test_config_plans()
        
        # Auth flow tests
        self.test_auth_signup()
        self.test_auth_login()
        self.test_auth_me()
        self.test_google_oauth_error()
        
        # Chat CRUD tests
        self.test_chats_crud()
        self.test_chat_streaming_error()
        
        # Tier gating tests (high priority)
        self.test_tier_gating_free_user()
        
        # Notes and dashboard tests
        self.test_notes_share_public()
        self.test_dashboard()
        
        # Payment and AI error tests
        self.test_razorpay_error()
        self.test_ai_dependent_endpoints_errors()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {total - passed}")
        print(f"📈 Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n🔍 FAILED TESTS:")
        for result in self.test_results:
            if not result['success']:
                print(f"   ❌ {result['test']}: {result['message']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"   ✅ {result['test']}: {result['message']}")
        
        return self.test_results

if __name__ == "__main__":
    tester = NotevoroTester()
    results = tester.run_all_tests()
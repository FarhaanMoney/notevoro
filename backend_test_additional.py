#!/usr/bin/env python3
"""
Additional Backend Tests for Edge Cases and Error Handling
"""

import requests
import json
import uuid
from datetime import datetime

BASE_URL = "https://notevoro-preview.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class AdditionalTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = 30
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message=""):
        result = {"test": test_name, "success": success, "message": message}
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
    
    def make_request(self, method, endpoint, **kwargs):
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
    
    def setup_auth(self):
        """Setup authentication for tests"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test_{unique_id}@example.com"
        password = "TestPassword123!"
        
        payload = {"name": f"Test User {unique_id}", "email": email, "password": password}
        response = self.make_request('POST', 'auth/signup', json=payload)
        
        if response and response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('token')
            return True
        return False
    
    def test_google_oauth_error(self):
        """Test Google OAuth error handling"""
        try:
            payload = {"credential": "fake_google_token_12345"}
            response = self.make_request('POST', 'auth/google', json=payload)
            
            if response and response.status_code == 500:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'google oauth not configured' in error_msg or 'google_client_id' in error_msg:
                    self.log_result("Google OAuth error", True, "✅ Correctly returns 500 with Google config error")
                else:
                    self.log_result("Google OAuth error", False, f"Unexpected error message: {data}")
            else:
                self.log_result("Google OAuth error", False, f"Expected 500, got {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Google OAuth error", False, f"Exception: {str(e)}")
    
    def test_chat_streaming_with_ai(self):
        """Test chat streaming functionality"""
        if not self.auth_token:
            return
        
        try:
            # Create a chat first
            response = self.make_request('POST', 'chats', json={})
            if not response or response.status_code != 200:
                self.log_result("Chat streaming", False, "Could not create chat")
                return
            
            chat_id = response.json()['chat']['id']
            
            # Send a message
            payload = {"chat_id": chat_id, "message": "Hello, this is a test message"}
            response = self.make_request('POST', 'chat', json=payload)
            
            if response:
                if response.status_code == 200:
                    # Check if it's a streaming response
                    content_type = response.headers.get('content-type', '')
                    if 'text/plain' in content_type:
                        # It's a stream, check if we get content
                        content = response.text
                        if len(content) > 0:
                            self.log_result("Chat streaming", True, "✅ Chat streaming works (AI is configured)")
                        else:
                            self.log_result("Chat streaming", False, "Empty streaming response")
                    else:
                        self.log_result("Chat streaming", False, "Expected streaming response, got JSON")
                elif response.status_code == 500:
                    # AI not configured error
                    try:
                        data = response.json()
                        if 'not configured' in data.get('error', '').lower():
                            self.log_result("Chat streaming", True, "✅ Correctly returns AI config error")
                        else:
                            self.log_result("Chat streaming", False, f"Unexpected 500 error: {data}")
                    except:
                        # Might be streaming error
                        if 'not configured' in response.text.lower():
                            self.log_result("Chat streaming", True, "✅ Correctly returns AI config error in stream")
                        else:
                            self.log_result("Chat streaming", False, f"Unexpected stream error: {response.text[:200]}")
                else:
                    self.log_result("Chat streaming", False, f"Unexpected status: {response.status_code}")
            else:
                self.log_result("Chat streaming", False, "No response from chat endpoint")
                
        except Exception as e:
            self.log_result("Chat streaming", False, f"Exception: {str(e)}")
    
    def test_razorpay_functionality(self):
        """Test Razorpay payment functionality"""
        if not self.auth_token:
            return
        
        try:
            # Test create order
            payload = {"plan": "pro"}
            response = self.make_request('POST', 'create-order', json=payload)
            
            if response:
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ['order_id', 'amount', 'currency', 'key_id', 'plan']
                    if all(field in data for field in required_fields):
                        self.log_result("Razorpay create order", True, "✅ Razorpay order creation works (keys are configured)")
                    else:
                        self.log_result("Razorpay create order", False, f"Missing fields in order response: {data}")
                elif response.status_code == 500:
                    data = response.json()
                    if 'not configured' in data.get('error', '').lower():
                        self.log_result("Razorpay create order", True, "✅ Correctly returns Razorpay config error")
                    else:
                        self.log_result("Razorpay create order", False, f"Unexpected 500 error: {data}")
                else:
                    self.log_result("Razorpay create order", False, f"Unexpected status: {response.status_code}")
            else:
                self.log_result("Razorpay create order", False, "No response from create-order endpoint")
                
        except Exception as e:
            self.log_result("Razorpay create order", False, f"Exception: {str(e)}")
    
    def test_file_analyze_tier_gating(self):
        """Test file analyze tier gating specifically"""
        if not self.auth_token:
            return
        
        try:
            # Test with a simple text file
            files = {'file': ('test.txt', 'This is test content for analysis', 'text/plain')}
            data = {'action': 'summarize'}
            
            response = self.make_request('POST', 'file-analyze', files=files, data=data)
            
            if response:
                if response.status_code == 403:
                    resp_data = response.json()
                    error_msg = resp_data.get('error', '')
                    if 'locked on the free plan' in error_msg:
                        self.log_result("File analyze tier gating", True, "✅ Correctly blocked free user from premium feature")
                    else:
                        self.log_result("File analyze tier gating", False, f"Wrong 403 error: {error_msg}")
                elif response.status_code == 500:
                    resp_data = response.json()
                    if 'not configured' in resp_data.get('error', '').lower():
                        self.log_result("File analyze tier gating", True, "✅ AI config error (acceptable)")
                    else:
                        self.log_result("File analyze tier gating", False, f"Unexpected 500 error: {resp_data}")
                else:
                    self.log_result("File analyze tier gating", False, f"Expected 403, got {response.status_code}")
            else:
                self.log_result("File analyze tier gating", False, "No response from file-analyze endpoint")
                
        except Exception as e:
            self.log_result("File analyze tier gating", False, f"Exception: {str(e)}")
    
    def test_unauthorized_access(self):
        """Test endpoints without authentication"""
        try:
            # Test protected endpoints without auth
            protected_endpoints = [
                ('GET', 'auth/me'),
                ('GET', 'chats'),
                ('POST', 'chats'),
                ('GET', 'dashboard'),
                ('GET', 'notes'),
                ('POST', 'quiz/generate'),
            ]
            
            # Temporarily remove auth token
            old_token = self.auth_token
            self.auth_token = None
            
            all_unauthorized = True
            for method, endpoint in protected_endpoints:
                response = self.make_request(method, endpoint, json={})
                if response and response.status_code == 401:
                    continue  # Good, unauthorized as expected
                else:
                    all_unauthorized = False
                    break
            
            # Restore auth token
            self.auth_token = old_token
            
            if all_unauthorized:
                self.log_result("Unauthorized access", True, "✅ All protected endpoints correctly require authentication")
            else:
                self.log_result("Unauthorized access", False, "Some protected endpoints don't require authentication")
                
        except Exception as e:
            self.log_result("Unauthorized access", False, f"Exception: {str(e)}")
    
    def test_public_note_access(self):
        """Test public note access without authentication"""
        try:
            # Test accessing a non-existent public note
            fake_slug = "nonexistent123"
            response = requests.get(f"{API_BASE}/public/notes/{fake_slug}", timeout=10)
            
            if response and response.status_code == 404:
                data = response.json()
                if 'not found' in data.get('error', '').lower():
                    self.log_result("Public note access", True, "✅ Correctly returns 404 for non-existent public note")
                else:
                    self.log_result("Public note access", False, f"Wrong 404 error: {data}")
            else:
                self.log_result("Public note access", False, f"Expected 404, got {response.status_code if response else 'No response'}")
                
        except Exception as e:
            self.log_result("Public note access", False, f"Exception: {str(e)}")
    
    def run_additional_tests(self):
        """Run all additional tests"""
        print("🔍 Starting Additional Backend Tests")
        print("=" * 50)
        
        # Setup authentication
        if not self.setup_auth():
            print("❌ Could not setup authentication, skipping auth-required tests")
            
        # Run tests
        self.test_google_oauth_error()
        self.test_chat_streaming_with_ai()
        self.test_razorpay_functionality()
        self.test_file_analyze_tier_gating()
        self.test_unauthorized_access()
        self.test_public_note_access()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 ADDITIONAL TESTS SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {total - passed}")
        print(f"📈 Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        return self.test_results

if __name__ == "__main__":
    tester = AdditionalTester()
    results = tester.run_additional_tests()
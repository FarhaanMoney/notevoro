// Test WhatsApp webhook manually
// Run: node test-webhook.js

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test123';

console.log('Testing WhatsApp webhook verification...');
console.log('Using verify token:', WHATSAPP_VERIFY_TOKEN);

// Test URL construction
const testUrl = `https://notevoro.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${WHATSAPP_VERIFY_TOKEN}&hub.challenge=12345`;
console.log('Test URL:', testUrl);

// Simulate the verification logic
const url = new URL(testUrl);
const hubMode = url.searchParams.get('hub.mode');
const hubChallenge = url.searchParams.get('hub.challenge');
const hubVerifyToken = url.searchParams.get('hub.verify_token');

console.log('Parsed parameters:', {
  hubMode,
  hubChallenge,
  hubVerifyToken,
  tokensMatch: hubVerifyToken === WHATSAPP_VERIFY_TOKEN
});

// Test validation
if (hubMode === 'subscribe' && hubChallenge && hubVerifyToken) {
  if (hubVerifyToken === WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Verification would succeed!');
    console.log('Response should be:', hubChallenge);
  } else {
    console.log('❌ Verification would fail - token mismatch');
  }
} else {
  console.log('❌ Invalid request format');
}

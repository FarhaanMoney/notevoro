// Test WhatsApp AI Flow
// This simulates the complete user message -> AI response -> WhatsApp reply flow

console.log('🧪 Testing WhatsApp AI Flow...');

// Simulate incoming WhatsApp message
const testMessage = {
  from: '1234567890', // User phone number
  timestamp: Date.now(),
  type: 'text',
  text: {
    body: 'Help me study for my math exam'
  }
};

console.log('📨 Simulating incoming message:', testMessage);

// Test the AI response generation
async function testAIResponse() {
  try {
    console.log('🤖 Testing AI response generation...');
    
    const response = await fetch('https://notevoro.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: testMessage.text.body,
        whatsapp_user: testMessage.from
      })
    });

    if (!response.ok) {
      console.error('❌ AI API test failed:', response.status);
      return;
    }

    console.log('✅ AI API test passed');
    
    // Test message cleaning
    const testAIResponse = '**Hello!** I can help you study. Here are some tips:\n\n1. Practice daily\n2. Review notes\n3. Solve problems';
    
    const cleaned = cleanAIResponseForWhatsApp(testAIResponse);
    console.log('🧹 Response cleaning test:');
    console.log('Original:', testAIResponse);
    console.log('Cleaned:', cleaned);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Clean AI response for WhatsApp (same function from webhook)
function cleanAIResponseForWhatsApp(response) {
  if (!response) return '';
  
  return response
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1')     // Remove italics
    .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
    .replace(/`(.*?)`/g, '$1')      // Remove inline code
    .replace(/#{1,6}\s/g, '')       // Remove headers
    .replace(/\n{3,}/g, '\n\n')     // Reduce multiple newlines
    .trim();
}

// Run the test
testAIResponse().then(() => {
  console.log('🎉 WhatsApp AI Flow test completed!');
}).catch(error => {
  console.error('❌ Test failed:', error);
});

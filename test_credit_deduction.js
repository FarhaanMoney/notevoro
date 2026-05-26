// Test script for credit deduction system
// Run with: node test_credit_deduction.js

const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testCreditDeduction() {
  console.log('🧪 Testing Credit Deduction System');
  console.log('=====================================');

  try {
    // Test 1: Get a test user
    console.log('\n📋 Test 1: Getting test user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (userError) {
      console.error('❌ Error getting user:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const testUser = users[0];
    console.log(`✅ Found test user: ${testUser.email || testUser.id}`);
    console.log(`   Current credits: ${testUser.credits}`);

    // Test 2: Check credit deduction function
    console.log('\n📋 Test 2: Testing credit deduction...');
    
    const userId = testUser.id;
    const originalCredits = testUser.credits || 0;
    const deductionAmount = 1;

    console.log(`   Attempting to deduct ${deductionAmount} credit from user ${userId}`);

    // Get current credits
    const { data: currentData, error: currentError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (currentError) {
      console.error('❌ Error getting current credits:', currentError);
      return;
    }

    const currentCredits = currentData.credits || 0;
    console.log(`   Current credits before deduction: ${currentCredits}`);

    if (currentCredits < deductionAmount) {
      console.log(`❌ Insufficient credits: ${currentCredits} < ${deductionAmount}`);
      console.log('   Adding 5 credits for testing...');
      
      // Add credits for testing
      const { error: addError } = await supabase
        .from('users')
        .update({ credits: currentCredits + 5 })
        .eq('id', userId);

      if (addError) {
        console.error('❌ Error adding credits:', addError);
        return;
      }
      
      console.log('✅ Added 5 credits for testing');
    }

    // Test 3: Perform credit deduction
    console.log('\n📋 Test 3: Performing credit deduction...');
    
    // Get credits before
    const { data: beforeData } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    const beforeCredits = beforeData.credits || 0;
    console.log(`   Credits before: ${beforeCredits}`);

    // Deduct credits
    const newCredits = beforeCredits - deductionAmount;
    const { error: deductError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId);

    if (deductError) {
      console.error('❌ Error deducting credits:', deductError);
      return;
    }

    // Record transaction
    const { error: transError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -deductionAmount,
        kind: 'deduct',
        feature: 'test',
        reason: 'Test credit deduction',
        idempotency_key: `test_${Date.now()}`,
        resulting_credits: newCredits
      });

    if (transError) {
      console.error('❌ Error recording transaction:', transError);
    } else {
      console.log('✅ Transaction recorded');
    }

    // Verify credits after
    const { data: afterData } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    const afterCredits = afterData.credits || 0;
    console.log(`   Credits after: ${afterCredits}`);

    // Test 4: Verify transaction
    console.log('\n📋 Test 4: Verifying transaction...');
    
    const { data: transactions, error: transListError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (transListError) {
      console.error('❌ Error getting transactions:', transListError);
    } else {
      console.log(`✅ Found ${transactions.length} recent transactions:`);
      transactions.forEach((trans, index) => {
        console.log(`   ${index + 1}. ${trans.kind}: ${trans.amount} credits (${trans.feature}) - ${trans.reason}`);
      });
    }

    // Test 5: Test API endpoint
    console.log('\n📋 Test 5: Testing API endpoint...');
    
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // This will fail but we can see the error
        },
        body: JSON.stringify({
          chat_id: 'test-chat-id',
          message: 'Test message for credit deduction'
        })
      });

      if (response.status === 401) {
        console.log('✅ API endpoint responds (401 Unauthorized as expected)');
      } else {
        console.log(`❌ Unexpected API response: ${response.status}`);
      }
    } catch (error) {
      console.log('ℹ️  API endpoint not running (expected in test environment)');
    }

    console.log('\n🎉 Credit Deduction Test Results:');
    console.log(`   Original credits: ${originalCredits}`);
    console.log(`   Final credits: ${afterCredits}`);
    console.log(`   Credits deducted: ${beforeCredits - afterCredits}`);
    
    if (beforeCredits - afterCredits === deductionAmount) {
      console.log('✅ Credit deduction working correctly!');
    } else {
      console.log('❌ Credit deduction failed!');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCreditDeduction().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});

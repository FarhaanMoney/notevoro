'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RazorpayScript from '@/components/payments/RazorpayScript';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PLAN_ENERGY, PLAN_FEATURES, PLAN_PRICES, PLAN_BADGE_COLORS } from '@/lib/plans';
import { Coins, Crown, Zap, BookOpen, Sparkles, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export default function PremiumPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const selectedPlanLabel = selectedPlan === 'pro' ? 'Pro' : selectedPlan === 'premium' ? 'Premium' : 'Free';
  const selectedPlanPrice = selectedPlan === 'pro' ? '₹299/month' : selectedPlan === 'premium' ? '₹499/month' : '₹0/month';

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    setLoading(false);
  }, [authLoading, isAuthenticated, router]);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '₹0',
      energyLabel: '20 AI Energy/day',
      energy: PLAN_ENERGY.free,
      period: 'per day',
      features: PLAN_FEATURES.free.features
    },
    {
      id: 'pro',
      name: 'Pro',
      price: `₹${PLAN_PRICES.pro}/month`,
      energyLabel: '250 AI Energy/day',
      energy: PLAN_ENERGY.pro,
      period: 'per day',
      highlighted: true,
      features: PLAN_FEATURES.pro.features
    },
    {
      id: 'premium',
      name: 'Premium',
      price: `₹${PLAN_PRICES.premium}/month`,
      energyLabel: 'Unlimited AI Energy',
      energy: PLAN_ENERGY.premium,
      period: 'unlimited',
      features: PLAN_FEATURES.premium.features
    }
  ];

  const handleUpgrade = (planId) => {
    console.log('Upgrade button clicked for plan:', planId);
    if (!planId) {
      console.error('No plan ID provided for upgrade');
      toast.error('Please select a plan to upgrade');
      return;
    }
    setSelectedPlan(planId);
    setShowPayment(true);
  };

  const processPayment = async (planId) => {
    console.log('Processing upgrade for plan:', planId);
    
    if (!user) {
      console.log('No user found, redirecting to auth');
      toast.error('Please log in to upgrade');
      router.push('/auth');
      return;
    }

    if (!planId) {
      console.error('No plan ID provided for upgrade');
      toast.error('Please select a plan to upgrade');
      return;
    }

    try {
      // Get current session token
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (!session?.access_token) {
        console.error('No session token found');
        toast.error('Please log in to continue');
        router.push('/auth');
        return;
      }

      console.log('Creating order with session:', session.user?.id);
      
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ plan: planId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Create order failed:', errorData);
        toast.error(errorData.error || 'Failed to create payment order');
        return;
      }

      const data = await response.json();
      console.log('Create order response:', data);

      // Use the order data directly from create-order response
      // No need to call checkout endpoint separately
      if (data.order_id && data.key_id) {
        console.log('Initializing Razorpay checkout...');
        
        // Create Razorpay checkout with backend-provided data
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'Notevoro AI',
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
          order_id: data.order_id,
          handler: async function(response) {
            console.log('Payment successful:', response);
            
            try {
              // Verify payment on backend
              const verifyResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              const verifyData = await verifyResponse.json();
              if (verifyData.success) {
                console.log('Payment verification successful:', verifyData);
                toast.success('Payment successful! Welcome! 🎉');
                router.push('/dashboard');
              } else {
                console.error('Payment verification failed:', verifyData);
                toast.error(verifyData.error || 'Payment verification failed');
              }
            } catch (verifyError) {
              console.error('Payment verification error:', verifyError);
              toast.error('Payment verification failed');
            }
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed');
            }
          }
        };

        try {
          const rzp = new Razorpay(options);
          rzp.open();
        } catch (razorpayError) {
          console.error('Razorpay initialization failed:', razorpayError);
          toast.error('Payment initialization failed. Please try again.');
        }
      } else {
        console.error('Invalid order response - missing order_id or key_id');
        toast.error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Payment processing failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/60 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <RazorpayScript />
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/60 to-black relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-blue-800/20 to-black/20 animate-pulse"></div>
        
        {/* Floating gradient orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="border-b border-white/5 bg-black/50 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>
              
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10">
                      <Zap className="h-3.5 w-3.5 text-yellow-300" />
                      <span className="text-xs">{user.aiEnergy ?? 0}</span>
                      <span className="text-[10px] text-zinc-400">AI Energy</span>
                    </div>
                    <Badge className={`capitalize ${PLAN_BADGE_COLORS[user.plan || 'free']}`}>
                      {user.is_trial_active ? '7-day trial' : user.plan}
                    </Badge>
                  </>
                ) : (
                  <Button onClick={() => router.push('/auth')} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Upgrade Your Study Experience
              </h1>
              <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
                Choose the plan that fits your learning style and unlock your full potential
              </p>
            </div>

            {/* Pricing cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative rounded-2xl border p-8 flex flex-col ${
                    plan.highlighted 
                      ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-blue-500/10' 
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-yellow-300 text-sm font-medium mt-2">
                      <Coins className="h-4 w-4" />
                      {plan.energyLabel}
                    </div>
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-zinc-200">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {user?.plan === plan.id ? (
                    <Button disabled className="w-full bg-white/10 text-zinc-300 py-3">
                      Current Plan
                    </Button>
                  ) : plan.id === 'free' ? (
                    <Button disabled className="w-full bg-white/10 text-zinc-400 py-3">
                      Free Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-3 font-medium ${
                        plan.highlighted 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90' 
                          : 'bg-white text-black hover:bg-zinc-200'
                      }`}
                    >
                      Get {plan.name}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Feature comparison */}
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
              <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden relative">
                {/* Gradient backgrounds */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-black/20"></div>
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                <div className="grid grid-cols-4 divide-x divide-white/10">
                  <div className="p-4 bg-black/20">
                    <h3 className="font-semibold mb-4">Feature</h3>
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-semibold mb-4">Free</h3>
                    <Badge className="bg-zinc-500/20 text-zinc-300">₹0/month</Badge>
                  </div>
                  <div className="p-4 text-center bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                    <h3 className="font-semibold mb-4">Pro</h3>
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">₹299/month</Badge>
                  </div>
                  <div className="p-4 text-center bg-gradient-to-br from-purple-700/10 to-indigo-700/10">
                    <h3 className="font-semibold mb-4">Premium</h3>
                    <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">₹499/month</Badge>
                  </div>
                </div>

                {[
                  { feature: 'Daily AI Energy', free: '20', pro: '250', premium: 'Unlimited' },
                  { feature: 'Chat with AI', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'Generate Quizzes', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'Flashcards', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'AI Notes', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'Mock Tests', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'File Analysis', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'Study Plans', free: '✓', pro: '✓', premium: '✓' },
                  { feature: 'Generation Speed', free: 'Standard', pro: 'Priority', premium: 'Highest' },
                  { feature: 'Advanced Analytics', free: 'Basic', pro: 'Advanced', premium: 'Premium Insights' }
                ].map((row, index) => (
                  <div key={index} className="grid grid-cols-4 divide-x divide-white/10">
                    <div className="p-4 border-t border-white/5">
                      <span className="text-zinc-200">{row.feature}</span>
                    </div>
                    <div className="p-4 text-center border-t border-white/5">
                      <span className="text-zinc-300">{row.free}</span>
                    </div>
                    <div className="p-4 text-center border-t border-white/5 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                      <span className="text-zinc-100 font-medium">{row.pro}</span>
                    </div>
                    <div className="p-4 text-center border-t border-white/5 bg-gradient-to-br from-purple-700/5 to-indigo-700/5">
                      <span className="text-zinc-100 font-medium">{row.premium}</span>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    q: 'Can I switch plans anytime?',
                    a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.'
                  },
                  {
                    q: 'Does Energy roll over?',
                      a: 'Currently, AI Energy resets according to your plan. We\'re working on Energy rollover for future updates.'
                  },
                  {
                    q: 'What payment methods do you accept?',
                    a: 'We accept all major credit cards, debit cards, UPI, and net banking through Razorpay.'
                  },
                  {
                    q: 'Is there a free trial?',
                    a: 'New users get a 7-day Pro trial with bonus AI Energy to test premium features.'
                  }
                ].map((faq, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/10 rounded-lg p-6">
                    <h3 className="font-semibold mb-3 text-zinc-200">{faq.q}</h3>
                    <p className="text-zinc-300">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Complete Your Upgrade</DialogTitle>
              <DialogDescription className="text-zinc-400">
                You're upgrading to <span className="text-purple-400 font-semibold">{selectedPlanLabel}</span> plan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span>Plan:</span>
                  <span className="font-semibold">{selectedPlanLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Price:</span>
                  <span className="font-semibold">{selectedPlanPrice}</span>
                </div>
              </div>
              <Button 
                onClick={() => processPayment(selectedPlan)}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white"
              >
                Proceed to Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

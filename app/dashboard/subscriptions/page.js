'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Check, Zap, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import Script from 'next/script'
import { PLANS } from '@/lib/payments/config'

export default function SubscriptionsPage() {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(false)
  const [processingPlan, setProcessingPlan] = useState(null)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch current plan
    const fetchCurrentPlan = async () => {
      try {
        const res = await fetch('/api/usage')
        const data = await res.json()
        if (data.plan) {
          setCurrentPlan(data.plan)
        }
      } catch (error) {
        console.error('[Subscriptions] Error fetching current plan:', error)
      }
    }
    fetchCurrentPlan()

    // Check if Razorpay is already loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      console.log('[Subscriptions] Razorpay already loaded')
      setRazorpayLoaded(true)
    }
  }, [])

  const handleUpgrade = async (planId) => {
    setError(null)
    setProcessingPlan(planId)
    setLoading(true)

    try {
      console.log('[Subscriptions] Starting upgrade process for plan:', planId)

      // Step 1: Create Razorpay order
      console.log('[Subscriptions] Creating Razorpay order...')
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('[Subscriptions] Order creation failed:', data)
        throw new Error(data.error || data.message || 'Failed to create payment order')
      }

      console.log('[Subscriptions] Order created successfully:', data)

      // Step 2: Check if Razorpay is loaded
      if (!razorpayLoaded || typeof window.Razorpay === 'undefined') {
        console.error('[Subscriptions] Razorpay not loaded')
        throw new Error('Payment system not ready. Please refresh the page and try again.')
      }

      // Step 3: Open Razorpay checkout
      console.log('[Subscriptions] Opening Razorpay checkout...')
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Notevoro',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        order_id: data.orderId,
        handler: async function (response) {
          console.log('[Subscriptions] Payment successful, verifying...', response)
          
          try {
            // Handle payment success
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan: planId,
                amount: data.amount / 100, // Convert from paise to rupees
                status: 'success',
              }),
            })

            const verifyData = await verifyRes.json()

            if (verifyData.success) {
              console.log('[Subscriptions] Payment verified successfully')
              // Refresh the page to show updated plan
              window.location.reload()
            } else {
              console.error('[Subscriptions] Payment verification failed:', verifyData)
              alert('Payment verification failed. Please contact support.')
              setProcessingPlan(null)
              setLoading(false)
            }
          } catch (verifyError) {
            console.error('[Subscriptions] Error during verification:', verifyError)
            alert('Payment verification error. Please contact support.')
            setProcessingPlan(null)
            setLoading(false)
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            console.log('[Subscriptions] Razorpay modal dismissed')
            setProcessingPlan(null)
            setLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
      
      console.log('[Subscriptions] Razorpay checkout opened')
    } catch (error) {
      console.error('[Subscriptions] Payment error:', error)
      setError(error.message)
      alert(error.message || 'Failed to initiate payment. Please try again.')
      setProcessingPlan(null)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        {/* Background gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="relative z-10 p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">Choose Your Plan</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Unlock Your Full Potential
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Upgrade to get unlimited access to all features and accelerate your learning journey
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {Object.values(PLANS).map((plan) => (
              <Card
                key={plan.id}
                className={`relative overflow-hidden ${
                  plan.id === 'free' 
                    ? 'from-gray-900 to-gray-800 border-gray-700' 
                    : plan.id === 'pro'
                    ? 'from-purple-900/50 to-blue-900/50 border-purple-500/50'
                    : 'from-blue-900/50 to-purple-900/50 border-blue-500/50'
                } border backdrop-blur-sm transition-all hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-purple-500/50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold mb-2">{plan.name}</div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">₹{plan.price}</span>
                      <span className="text-gray-400">{plan.period}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">{plan.description}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => plan.id !== currentPlan && handleUpgrade(plan.id)}
                    disabled={plan.id === currentPlan || loading || !razorpayLoaded}
                    className={`w-full ${
                      plan.id === currentPlan
                        ? 'bg-gray-700 hover:bg-gray-600 cursor-not-allowed'
                        : plan.id === 'pro'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                        : plan.id === 'premium'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : plan.id === currentPlan ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </>
                    ) : !razorpayLoaded ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Features Highlight */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold">Instant Access</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Upgrade and get immediate access to all premium features. No waiting period.
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold">Cancel Anytime</h3>
              </div>
              <p className="text-gray-400 text-sm">
                No long-term commitments. Cancel your subscription at any time without penalties.
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold">Priority Support</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Get priority support and early access to new features as a premium member.
              </p>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Razorpay Script */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[Subscriptions] Razorpay script loaded')
          setRazorpayLoaded(true)
        }}
        onError={() => {
          console.error('[Subscriptions] Razorpay script failed to load')
          setError('Payment system failed to load. Please refresh the page.')
        }}
      />
    </>
  )
}
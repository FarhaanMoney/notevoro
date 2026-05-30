'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Sparkles, Check } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, feature }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '10 AI chats per day',
        '5 AI notes per day',
        '3 quizzes per day',
        '2 mock tests per day',
        'Basic flashcards',
      ],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      name: 'Pro',
      price: '$9',
      period: 'per month',
      features: [
        'Unlimited AI chats',
        'Unlimited AI notes',
        'Unlimited quizzes',
        'Unlimited mock tests',
        'Advanced flashcards with spaced repetition',
        'Priority support',
      ],
      cta: 'Upgrade to Pro',
      popular: true,
    },
    {
      name: 'Premium',
      price: '$19',
      period: 'per month',
      features: [
        'Everything in Pro',
        'AI-powered visual learning',
        'File upload support (PDF, images)',
        'WhatsApp study assistant',
        'Advanced analytics',
        '24/7 priority support',
      ],
      cta: 'Upgrade to Premium',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your Learning Experience</DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {feature && (
            <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-sm text-purple-900">
                You&apos;ve reached your daily limit for <strong>{feature}</strong>. Upgrade to continue learning without limits.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 border-2 transition-all ${
                  plan.popular
                    ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {plan.name === 'Pro' && <Crown className="h-5 w-5 text-purple-500" />}
                    {plan.name === 'Premium' && <Sparkles className="h-5 w-5 text-purple-500" />}
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  disabled={plan.disabled}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              All plans include a 7-day free trial. Cancel anytime.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

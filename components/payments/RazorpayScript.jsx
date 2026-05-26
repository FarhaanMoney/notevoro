'use client';

import Script from 'next/script';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads Razorpay only when a public key exists.
 * Avoids checkout-static-next.razorpay.com/build/undefined from invalid script attrs.
 */
export default function RazorpayScript({ enabled = true }) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  if (!enabled || !keyId) {
    return null;
  }

  return <Script src={RAZORPAY_SCRIPT} strategy="lazyOnload" />;
}

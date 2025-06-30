'use client';

import { GoogleAnalytics as GA } from '@next/third-parties/google';

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Only run Google Analytics in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  if (!gaId) {
    console.warn('Google Analytics ID not found. Please set NEXT_PUBLIC_GA_ID in your Vercel environment variables.');
    return null;
  }

  return <GA gaId={gaId} />;
} 
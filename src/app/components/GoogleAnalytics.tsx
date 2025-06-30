'use client';

import { GoogleAnalytics as GA } from '@next/third-parties/google';

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) {
    // Only show warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Google Analytics ID not found. Please set NEXT_PUBLIC_GA_ID in your environment variables.');
    }
    return null;
  }

  return <GA gaId={gaId} />;
} 
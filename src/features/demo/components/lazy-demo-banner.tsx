'use client';

import dynamic from 'next/dynamic';

// Splitting from a client boundary keeps the banner and its sign-out code out of every real user's first load.
export const LazyDemoBanner = dynamic(() => import('./demo-banner').then(module => module.DemoBanner));

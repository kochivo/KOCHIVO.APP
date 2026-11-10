'use client';

import dynamic from 'next/dynamic';

export const KoWidget = dynamic(() => import('./ko-widget').then(module => module.KoWidget), {
  ssr: false, loading: () => null,
});

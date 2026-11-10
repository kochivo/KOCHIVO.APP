'use client';

import dynamic from 'next/dynamic';

export const RankChip = dynamic(() => import('./rank-chip').then(module => module.RankChip), {
  loading: () => null,
});

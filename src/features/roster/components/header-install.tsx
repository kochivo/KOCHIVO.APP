'use client';

import dynamic from 'next/dynamic';

const InstallButton = dynamic(() => import('@/features/install').then(module => module.InstallButton), { ssr: false });

export function HeaderInstall() {
  return <InstallButton role="captain" icon />;
}

'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale } from '@/core/i18n/client';
import { useResource } from '@/core/resource/use-resource';
import { loadCaptainFrameCounts } from './captain-frame-data';
import { frameParent } from './captain-frame-model';
import type { FrameCounts } from './captain-frame-model';
import { CaptainFrameNavView } from './captain-frame-nav-view';
import { LoadingState } from '@/ui/loading-state';
import { useTaskCount } from '../hooks/use-task-count';

const CaptainMoreSheet = dynamic(() => import('./captain-more-sheet').then(module => module.CaptainMoreSheet), {
  loading: () => <LoadingState />,
});

export function CaptainFrameNav({ counts: initialCounts }: { counts: FrameCounts }) {
  const load = useCallback(() => loadCaptainFrameCounts(), []);
  const resource = useResource('captain:frame-counts', load, { pollMs: 30_000 });
  const live = resource.error ? { inbox: null, join: null, billing: null } : resource.data ?? initialCounts;
  const path = usePathname();
  const tasks = useTaskCount(path, useLocale());
  const counts = { ...live, tasks };
  const active = frameParent(path);
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const open = sheetPath === path;
  return <CaptainFrameNavView active={active} counts={counts} open={open}
    onMore={() => setSheetPath(path)} onClose={() => setSheetPath(null)}
    more={open && <CaptainMoreSheet active={active} counts={counts} onClose={() => setSheetPath(null)} />} />;
}

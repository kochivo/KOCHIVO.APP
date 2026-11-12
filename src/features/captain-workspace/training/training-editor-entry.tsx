'use client';

import { lazy, Suspense } from 'react';
import type { ComponentProps } from 'react';
import type { TrainingEditor } from './training-editor';

const Editor = lazy(() => import('./training-editor').then(module => ({ default: module.TrainingEditor })));
// The server passes the loading text so this entry stays free of the editor's message bundle.
export function TrainingEditorEntry({ loadingLabel, ...props }: ComponentProps<typeof TrainingEditor> & { loadingLabel: string }) {
  return <Suspense fallback={<div role="status" className="glass min-h-64 rounded-card p-5 text-faint">{loadingLabel}</div>}>
    <Editor {...props} />
  </Suspense>;
}

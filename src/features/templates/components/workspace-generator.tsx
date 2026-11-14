'use client';

import { useEffect, useRef } from 'react';
import { GenerateButton } from '@/features/program-generator';
import { openGeneratorWhenReady } from './workspace-generator-trigger';

export function WorkspaceGenerator({ request }: { request: number }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (container.current) return openGeneratorWhenReady(container.current);
  }, [request]);
  // Keep the existing generator dialog and its state, with the workspace top bar as its entry.
  return <div ref={container} className="[&>button]:hidden"><GenerateButton /></div>;
}

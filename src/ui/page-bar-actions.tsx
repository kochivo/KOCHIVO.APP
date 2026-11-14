'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePageBarTarget } from './page-bar-slot';

export function PageBarActions({ children }: { children: ReactNode }) {
  const target = usePageBarTarget('actions');
  return target ? createPortal(children, target) : null;
}

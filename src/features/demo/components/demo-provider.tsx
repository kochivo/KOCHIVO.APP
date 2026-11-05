'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const DemoContext = createContext<string | null>(null);
export const useDemoExpiry = () => useContext(DemoContext);

export function DemoProvider({ expiresAt, children }: { expiresAt: string | null; children: ReactNode }) {
  return <DemoContext value={expiresAt}>{children}</DemoContext>;
}

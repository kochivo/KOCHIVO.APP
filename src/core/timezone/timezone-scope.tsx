'use client';
import type { ReactNode } from 'react';
import { profileTimezone } from '@/lib/timezone';
import { internationalEnabled } from '@/lib/international-enabled';
import { TimezoneContext } from './client';

/** Display another player's records without changing the signed-in user's action clock. */
export function TimezoneScope({ timezone, children }: { timezone?: string; children: ReactNode }) {
  if (!internationalEnabled()) return children;
  return <TimezoneContext value={profileTimezone(timezone)}>{children}</TimezoneContext>;
}

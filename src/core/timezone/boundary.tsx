import type { ReactNode } from 'react';
import { internationalEnabled } from '@/lib/international-enabled';
import { getTimezoneProfile } from './server';
import { TimezoneProvider } from './timezone-provider';

export async function TimezoneBoundary({ children }: { children: ReactNode }) {
  if (!internationalEnabled()) return children;
  return <TimezoneProvider profile={await getTimezoneProfile()}>{children}</TimezoneProvider>;
}

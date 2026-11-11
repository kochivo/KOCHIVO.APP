'use client';
import { createContext, useContext } from 'react';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { profileTimezone } from '@/lib/timezone';

export const TimezoneContext = createContext(DEFAULT_TIMEZONE);
export const ViewerTimezoneContext = createContext<string | undefined>(undefined);
export function useTimezone(): string {
  return profileTimezone(useContext(TimezoneContext));
}

/** Request controls keep the signed-in clock even inside another player's record scope. */
export function useViewerTimezone(): string {
  const viewer = useContext(ViewerTimezoneContext);
  const scoped = useContext(TimezoneContext);
  return profileTimezone(viewer ?? scoped);
}

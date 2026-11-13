'use client';

import { useEffect } from 'react';
import { isInstalledApp } from '@/lib/installed-app';
export { isInstalledApp } from '@/lib/installed-app';

// Older installs (iOS keeps the start URL from install time) still open "/": skip the marketing page inside the app.
export function InstalledAppRedirect() {
  useEffect(() => {
    if (isInstalledApp(window)) window.location.replace('/welcome');
  }, []);
  return null;
}

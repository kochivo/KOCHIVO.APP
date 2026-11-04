'use client';

import { useEffect } from 'react';

// Older installs (iOS keeps the start URL from install time) still open "/": skip the marketing page inside the app.
export function isInstalledApp(win: Pick<Window, 'matchMedia'> & { navigator: Navigator & { standalone?: boolean } }): boolean {
  return win.matchMedia('(display-mode: standalone)').matches || win.navigator.standalone === true;
}

export function InstalledAppRedirect() {
  useEffect(() => {
    if (isInstalledApp(window)) window.location.replace('/login');
  }, []);
  return null;
}

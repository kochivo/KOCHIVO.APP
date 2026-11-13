'use client';

import { useEffect } from 'react';
import { shouldWelcome } from '../welcome-navigation';

export function InstalledLoginRedirect() {
  useEffect(() => {
    if (shouldWelcome(window, window.location.search)) window.location.replace('/welcome');
  }, []);
  return null;
}

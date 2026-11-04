'use client';

import { useEffect } from 'react';
import { useRestMood } from '../hooks/use-rest-mood';

export function RestMoodSync({ onChange }: { onChange: (rest: boolean) => void }) {
  const rest = useRestMood(true);
  useEffect(() => { onChange(rest); }, [rest, onChange]);
  return null;
}

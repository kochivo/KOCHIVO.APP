'use client';
import { useEffect } from 'react';
import { CaptainVoiceNotes } from '@/features/voice-notes';

export function FileVoiceContent({ playerId }: { playerId: string }) {
  useEffect(() => {
    const arrive = () => {
      if (window.location.hash !== `#voice-recorder-${playerId}`) return;
      const recorder = document.getElementById(`voice-recorder-${playerId}`);
      const button = recorder?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      if (!recorder || !button) return;
      recorder.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
      button.focus({ preventScroll: true });
    };
    arrive(); window.addEventListener('hashchange', arrive);
    return () => window.removeEventListener('hashchange', arrive);
  }, [playerId]);
  return <CaptainVoiceNotes playerId={playerId} />;
}

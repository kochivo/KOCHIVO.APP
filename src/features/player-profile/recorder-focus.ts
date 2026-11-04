export function focusRecorder(playerId: string) {
  const recorder = document.getElementById(`voice-recorder-${playerId}`);
  const button = recorder?.querySelector<HTMLButtonElement>('button:not(:disabled)');
  if (!recorder || !button) return false;
  recorder.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  button.focus({ preventScroll: true });
  return true;
}

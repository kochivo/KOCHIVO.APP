let context: AudioContext | undefined;

export function prepareRestChime(): void {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => undefined);
  } catch { /* Audio is optional on browsers that block it. */ }
}

export function playRestChime(): void {
  try {
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.frequency.setValueAtTime(660, start);
    oscillator.frequency.setValueAtTime(880, start + 0.125);
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.setValueAtTime(0.12, start + 0.2);
    gain.gain.linearRampToValueAtTime(0, start + 0.25);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + 0.25);
  } catch { /* A blocked chime must never interrupt the workout. */ }
}

import { DURATION, CUTS } from './timeline.mjs';

function tone(ctx, bus, frequency, when, duration, amplitude, type = 'sine', endFrequency) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(amplitude, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(gain).connect(bus);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.02);
}

export function createScore(ctx) {
  const bus = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 14;
  limiter.ratio.value = 5;
  bus.connect(limiter);
  bus.gain.value = 0.7;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  let seed = 173;
  for (let i = 0; i < samples.length; i++) {
    seed = (seed * 16807) % 2147483647;
    samples[i] = seed / 1073741823.5 - 1;
  }
  function percussion(when, duration, amplitude, highpass) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(amplitude, when);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(envelope).connect(bus);
    source.start(when);
    source.stop(when + duration);
  }
  return {
    output: limiter,
    schedule(start, offset = 0) {
      const beat = 60 / 112;
      const notes = [55, 55, 65.406, 48.999];
      for (let i = 0; i * beat < DURATION; i++) {
        const at = i * beat;
        if (at < offset) continue;
        const when = start + at - offset;
        const outro = at > 27.5;
        if (!outro || i % 2 === 0) tone(ctx, bus, 125, when, 0.24, 0.55, 'sine', 39);
        if (i % 2 === 1 && !outro) percussion(when, 0.12, 0.16, 1500);
        if (!outro) {
          percussion(when + beat / 2, 0.045, 0.07, 8500);
          const bass = notes[Math.floor(i / 8) % notes.length];
          tone(ctx, bus, bass, when + 0.015, beat * 0.74, 0.12, 'triangle');
          if (i % 2 === 0) tone(ctx, bus, bass * (i % 4 === 0 ? 8 : 12), when + beat / 4, 0.28, 0.035, 'sine');
        }
      }
      CUTS.slice(1, -1).forEach(at => {
        if (at < offset) return;
        const when = start + at - offset;
        percussion(when, 0.18, 0.11, 2900);
        tone(ctx, bus, at > 27 ? 440 : 660, when, 0.2, 0.06, 'sine', 220);
      });
      bus.gain.setValueAtTime(0.7, start);
      const fade = Math.max(start, start + DURATION - offset - 1.15);
      bus.gain.setValueAtTime(0.7, fade);
      bus.gain.linearRampToValueAtTime(0, start + DURATION - offset);
    },
  };
}

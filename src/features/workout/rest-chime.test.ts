import { afterEach, expect, it, vi } from 'vitest';
import { playRestChime, prepareRestChime } from './rest-chime';

afterEach(() => { vi.unstubAllGlobals(); });
it('generates two short tones and disconnects the audio nodes', () => {
  const frequency = { setValueAtTime: vi.fn() };
  const oscillator = { frequency, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: () => {} };
  const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  vi.stubGlobal('AudioContext', class {
    state = 'running'; currentTime = 5; destination = {};
    resume = async () => undefined;
    createOscillator = () => oscillator;
    createGain = () => gain;
  });
  prepareRestChime(); playRestChime();
  expect(frequency.setValueAtTime.mock.calls).toEqual([[660, 5], [880, 5.125]]);
  expect(oscillator.stop).toHaveBeenCalledWith(5.25);
  oscillator.onended();
  expect(oscillator.disconnect).toHaveBeenCalledOnce();
  expect(gain.disconnect).toHaveBeenCalledOnce();
});

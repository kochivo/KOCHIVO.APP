import { afterEach, expect, it, vi } from 'vitest';
import type * as ReactModule from 'react';
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
import { useRecorder } from './hooks/use-recorder';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('releases a late microphone grant after the reply is discarded', async () => {
  let grant: (stream: object) => void = () => {};
  const permission = new Promise<object>(resolve => { grant = resolve; });
  const construct = vi.fn();
  const stop = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => permission } });
  vi.stubGlobal('MediaRecorder', class {
    static isTypeSupported() { return true; }
    constructor() { construct(); }
    start() {}
  });
  vi.stubGlobal('setInterval', vi.fn(() => 1));
  const recorder = useRecorder();
  const starting = recorder.start();
  recorder.reset();
  grant({ getTracks: () => [{ stop }] }); await starting;
  expect(stop).toHaveBeenCalledTimes(1);
  expect(construct).not.toHaveBeenCalled();
});

it('ignores an already queued stop event after discarding the recording', async () => {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] };
  const instances: Recorder[] = [];
  class Recorder {
    static isTypeSupported() { return true; }
    state = 'recording';
    mimeType = 'audio/webm';
    stream = stream;
    onstop: (() => void) | null = null;
    constructor() { instances.push(this); }
    start() {}
    stop() { this.state = 'inactive'; }
  }
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => stream } });
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal('setInterval', vi.fn(() => 1)); vi.stubGlobal('clearInterval', vi.fn());
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
  const recorder = useRecorder();
  await recorder.start(); recorder.stop();
  const media = instances[0];
  const queuedStop = media?.onstop;
  recorder.reset();
  expect(media?.onstop).toBeNull();
  queuedStop?.();
  expect(create).not.toHaveBeenCalled();
});

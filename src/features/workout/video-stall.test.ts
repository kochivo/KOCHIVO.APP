import { describe, expect, it } from 'vitest';
import { initialVideoStall, reduceVideoStall, watchVideoStall } from './video-stall';

const origin = 'https://www.youtube-nocookie.com';
const message = (info: unknown) => ({ type: 'message' as const, origin, data: JSON.stringify({ event: 'infoDelivery', info }) });
describe('YouTube stall detection', () => {
  it('uses an injected clock and releases its timer', () => {
    let now = 0;
    let tick = () => {};
    let notified = 0;
    let disposed = false;
    const watcher = watchVideoStall(() => { notified++; }, {
      now: () => now,
      repeat: callback => { tick = callback; return () => { disposed = true; }; },
    });
    watcher.send({ type: 'start' });
    now = 10_000;
    tick();
    tick();
    expect(notified).toBe(1);
    watcher.dispose();
    expect(disposed).toBe(true);
  });
  it('stalls after eight seconds of continuous buffering', () => {
    const state = reduceVideoStall(initialVideoStall, message({ playerState: 3 }), 100);
    expect(reduceVideoStall(state, { type: 'tick' }, 8099).stalled).toBe(false);
    expect(reduceVideoStall(state, { type: 'tick' }, 8100).stalled).toBe(true);
  });
  it('does not restart buffering deadlines on repeated messages', () => {
    let state = reduceVideoStall(initialVideoStall, message({ playerState: 3 }), 0);
    state = reduceVideoStall(state, message({ playerState: 3 }), 7000);
    expect(reduceVideoStall(state, { type: 'tick' }, 8000).stalled).toBe(true);
  });
  it('tracks advancing playback and stalls when progress stops', () => {
    let state = reduceVideoStall(initialVideoStall, message({ playerState: 1, currentTime: 0 }), 0);
    state = reduceVideoStall(state, message({ currentTime: 7 }), 7000);
    expect(reduceVideoStall(state, { type: 'tick' }, 14000).stalled).toBe(false);
    expect(reduceVideoStall(state, { type: 'tick' }, 15000).stalled).toBe(true);
  });
  it('waits ten seconds for the first state after load or first tap', () => {
    let state = reduceVideoStall(initialVideoStall, { type: 'start' }, 0);
    state = reduceVideoStall(state, { type: 'start' }, 9000);
    expect(reduceVideoStall(state, { type: 'tick' }, 9999).stalled).toBe(false);
    expect(reduceVideoStall(state, { type: 'tick' }, 10000).stalled).toBe(true);
  });
  it('accepts onStateChange and does not call a paused player stalled', () => {
    const state = reduceVideoStall(initialVideoStall, { type: 'message', origin, data: '{"event":"onStateChange","info":2}' }, 0);
    expect(reduceVideoStall(state, { type: 'tick' }, 20000).stalled).toBe(false);
  });
  it.each(['garbage', 'null', '{}', '{"event":"infoDelivery","info":{"playerState":"3"}}',
    '{"event":"onStateChange","info":99}'])('ignores malformed messages: %s', data => {
    expect(reduceVideoStall(initialVideoStall, { type: 'message', origin, data }, 0)).toEqual(initialVideoStall);
  });
  it('ignores messages from another origin', () => {
    expect(reduceVideoStall(initialVideoStall, { ...message({ playerState: 3 }), origin: 'https://evil.test' }, 0)).toEqual(initialVideoStall);
  });
});

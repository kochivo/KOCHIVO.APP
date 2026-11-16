export type VideoStallState = { stalled: boolean; started: number | null; received: boolean;
  playerState: number | null; since: number | null; currentTime: number | null };
export type VideoStallEvent = { type: 'start' | 'tick' } | { type: 'message'; origin: string; data: unknown };
export const initialVideoStall: VideoStallState = {
  stalled: false, started: null, received: false, playerState: null, since: null, currentTime: null,
};
export const youtubeOrigin = 'https://www.youtube-nocookie.com';
function playerInfo(origin: string, data: unknown): { playerState?: number; currentTime?: number } | null {
  if (origin !== youtubeOrigin || typeof data !== 'string') return null;
  try {
    const payload: unknown = JSON.parse(data);
    if (!payload || typeof payload !== 'object' || !('event' in payload) || !('info' in payload)) return null;
    const info: unknown = payload.event === 'onStateChange' ? { playerState: payload.info } :
      payload.event === 'infoDelivery' ? payload.info : null;
    if (!info || typeof info !== 'object') return null;
    const state = 'playerState' in info ? info.playerState : undefined;
    const time = 'currentTime' in info ? info.currentTime : undefined;
    if (state !== undefined && (typeof state !== 'number' || ![-1, 0, 1, 2, 3, 5].includes(state))) return null;
    if (time !== undefined && (typeof time !== 'number' || !Number.isFinite(time) || time < 0)) return null;
    if (state === undefined && time === undefined) return null;
    return { playerState: state as number | undefined, currentTime: time as number | undefined };
  } catch { return null; }
}
export function reduceVideoStall(state: VideoStallState, event: VideoStallEvent, now: number): VideoStallState {
  if (state.stalled) return state;
  if (event.type === 'start') return state.started === null ? { ...state, started: now } : state;
  if (event.type === 'message') {
    const info = playerInfo(event.origin, event.data);
    if (!info) return state;
    const playerState = info.playerState ?? state.playerState;
    const advancing = info.currentTime !== undefined && (state.currentTime === null || info.currentTime > state.currentTime);
    const since = playerState !== state.playerState || (playerState === 1 && advancing) ? now : state.since;
    return { ...state, playerState, since, currentTime: info.currentTime ?? state.currentTime,
      received: state.received || info.playerState !== undefined };
  }
  const stalled = (!state.received && state.started !== null && now - state.started >= 10_000) ||
    ((state.playerState === 3 || state.playerState === 1) && state.since !== null && now - state.since >= 8_000);
  return stalled ? { ...state, stalled: true } : state;
}

export interface VideoClock {
  now: () => number;
  repeat: (callback: () => void) => () => void;
}
export const videoClock: VideoClock = {
  now: () => performance.now(),
  repeat: callback => { const timer = window.setInterval(callback, 250); return () => window.clearInterval(timer); },
};
export function watchVideoStall(onStall: () => void, clock: VideoClock = videoClock) {
  let state = initialVideoStall;
  const send = (event: VideoStallEvent) => {
    const next = reduceVideoStall(state, event, clock.now());
    const newlyStalled = next.stalled && !state.stalled;
    state = next;
    if (newlyStalled) onStall();
  };
  const dispose = clock.repeat(() => send({ type: 'tick' }));
  return { send, dispose };
}

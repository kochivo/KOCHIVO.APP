export const WIDTH = 1080;
export const HEIGHT = 1920;
export const clamp = value => Math.max(0, Math.min(1, value));
export const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };

export function createTimeline(scenes) {
  if (!scenes.length) throw new Error('A guide needs at least one scene');
  let duration = 0;
  const ids = new Set();
  const entries = scenes.map(scene => {
    if (!scene.id || ids.has(scene.id) || !Number.isFinite(scene.seconds) || scene.seconds <= 0
      || !scene.captions?.length || scene.seconds / scene.captions.length < 5) {
      throw new Error('Scenes need unique ids and at least five seconds per caption');
    }
    ids.add(scene.id);
    const start = duration;
    duration += scene.seconds;
    return { ...scene, start, end: duration };
  });
  return { entries, duration };
}

export function locate(timeline, seek) {
  const time = Math.min(timeline.duration, Math.max(0, Number.isFinite(seek) ? seek : 0));
  const index = Math.max(0, timeline.entries.findIndex(scene => time < scene.end));
  const actual = time === timeline.duration ? timeline.entries.length - 1 : index;
  const scene = timeline.entries[actual];
  const elapsed = time - scene.start;
  return { scene, index: actual, time, elapsed, progress: clamp(elapsed / scene.seconds) };
}

export function captionAt(state) {
  const { captions, seconds } = state.scene;
  return captions[Math.min(captions.length - 1, Math.floor(state.elapsed / (seconds / captions.length)))];
}

export function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

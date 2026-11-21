import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTimeline, locate, formatTime, captionAt } from './timeline.mjs';

const scenes = [
  { id: 'invite', seconds: 12, captions: ['Open invitation', 'Choose sign in'] },
  { id: 'workout', seconds: 18, captions: ['Choose workout', 'Log a set', 'Rest'] },
];
const timeline = createTimeline(scenes);

test('seeking uses half-open scene boundaries and clamps the ending', () => {
  assert.equal(timeline.duration, 30);
  assert.equal(locate(timeline, 11.999).scene.id, 'invite');
  assert.equal(locate(timeline, 12).scene.id, 'workout');
  assert.equal(locate(timeline, 30).scene.id, 'workout');
  assert.equal(locate(timeline, 100).time, 30);
  assert.equal(locate(timeline, -1).time, 0);
  assert.equal(locate(timeline, Number.NaN).time, 0);
  assert.equal(locate(timeline, Number.POSITIVE_INFINITY).time, 0);
});

test('caption pacing divides each scene into readable windows', () => {
  assert.equal(captionAt(locate(timeline, 0)), 'Open invitation');
  assert.equal(captionAt(locate(timeline, 6)), 'Choose sign in');
  assert.equal(captionAt(locate(timeline, 18)), 'Log a set');
  assert.equal(captionAt(locate(timeline, 30)), 'Rest');
});

test('formatTime handles minutes and invalid inputs without negative output', () => {
  assert.equal(formatTime(65.9), '01:05');
  assert.equal(formatTime(300), '05:00');
  assert.equal(formatTime(-4), '00:00');
  assert.equal(formatTime(Number.NaN), '00:00');
});

test('rejects empty timelines, duplicate scenes and unreadable caption pacing', () => {
  assert.throws(() => createTimeline([]));
  assert.throws(() => createTimeline([scenes[0], scenes[0]]));
  assert.throws(() => createTimeline([{ id: 'bad', seconds: 0, captions: ['x'] }]));
  assert.throws(() => createTimeline([{ id: 'bad', seconds: 5, captions: ['a', 'b'] }]));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { position, CUTS, DURATION } from './timeline.mjs';
import { messages } from './messages.ts';

test('scrubbing before the beginning or beyond the end keeps a valid scene', () => {
  assert.equal(position(-100).index, 0);
  const last = position(DURATION + 10);
  assert.equal(last.index, messages.steps.length - 1);
  assert.ok(last.progress > 0.99 && last.progress < 1);
});

test('every cut switches directly to a fully specified scene', () => {
  for (let i = 1; i < CUTS.length - 1; i++) {
    assert.equal(position(CUTS[i] - 0.001).index, i - 1);
    const next = position(CUTS[i]);
    assert.equal(next.index, i);
    assert.equal(next.elapsed, 0);
    assert.ok(messages.steps[i].title.length > 0);
    assert.ok(next.duration >= 3);
  }
});

test('feature shots have matching footage and translated role labels', () => {
  for (const scene of messages.steps.slice(1, -1)) {
    assert.ok(['dashboard', 'program', 'nutrition', 'workout', 'muscles', 'progress'].includes(scene.asset));
    assert.ok(messages[scene.role]);
    assert.ok(scene.sub);
  }
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ExerciseImage } from './exercise-image';
import { Deferred } from './deferred';

it('reserves exercise media space without requesting a GIF before visibility is known', () => {
  const html = renderToStaticMarkup(createElement(ExerciseImage, {
    src: 'https://example.test/exercise.gif', alt: 'Squat', width: 84, height: 84,
  }));
  expect(html).toContain('data:image/svg+xml,');
  expect(html).toContain('loading="lazy"');
  expect(html).not.toContain('exercise.gif');
  expect(html).toContain('aspect-ratio:84/84');
  expect(html).toContain('alt="Squat"');
});

it('does not render deferred media or client panels before they enter the viewport', () => {
  const html = renderToStaticMarkup(createElement(Deferred, {
    fallback: createElement('div', { role: 'status' }, 'Loading'),
  }, createElement('img', { src: 'https://example.test/heavy.gif', alt: '' })));
  expect(html).toContain('role="status"');
  expect(html).not.toContain('heavy.gif');
});

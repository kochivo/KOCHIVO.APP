import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { ExerciseVideo } from './components/exercise-video';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, serverOnline: true, clientOnline: true }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useId: () => 'video-opener',
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => boolean, serverSnapshot: () => boolean) => {
    state.serverOnline = serverSnapshot(); state.clientOnline = snapshot();
    return state.clientOnline;
  },
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
type Props = { children?: unknown; onClick?: () => void; onError?: () => void; onDismiss?: () => void;
  onLoad?: () => void; footer?: unknown; 'aria-haspopup'?: string; 'aria-disabled'?: boolean; disabled?: boolean };
function elements(node: unknown): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Props>;
  return [element, ...elements(element.props.children), ...elements(element.props.footer)];
}
const render = (url = 'https://youtube.com/shorts/dQw4w9WgXcQ') => {
  state.index = 0;
  return ExerciseVideo({ url, name: 'Row' });
};
function open(url?: string) {
  elements(render(url)).find(node => node.props['aria-haspopup'] === 'dialog')?.props.onClick?.();
  return render(url);
}
beforeEach(() => { state.values = []; state.index = 0; });
afterEach(() => vi.unstubAllGlobals());
it('keeps the server snapshot stable when hydrating offline, then renders the client warning', () => {
  vi.stubGlobal('navigator', { onLine: false });
  const html = renderToStaticMarkup(render());
  expect(state.serverOnline).toBe(true);
  expect(state.clientOnline).toBe(false);
  expect(html).toContain('Video needs internet. You can keep training; everything is saved.');
  const opener = elements(render()).find(node => node.props['aria-haspopup'] === 'dialog');
  expect(opener?.props['aria-disabled']).toBe(true);
  expect(opener?.props.disabled).not.toBe(true);
  opener?.props.onClick?.();
  expect(renderToStaticMarkup(render())).not.toContain('<dialog');
});
it('mounts a safe vertical iframe only after opening and unmounts it on dismiss', () => {
  expect(renderToStaticMarkup(render())).not.toContain('<iframe');
  const tree = open();
  const html = renderToStaticMarkup(tree);
  expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?mute=1');
  expect(html).toContain('aspect-[9/16]');
  expect(html).toContain('allow="autoplay; encrypted-media; picture-in-picture; fullscreen"');
  expect(html).toContain('referrerPolicy="strict-origin-when-cross-origin"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('Back to the set');
  elements(tree).find(node => node.props.onDismiss)?.props.onDismiss?.();
  expect(renderToStaticMarkup(render())).not.toContain('<iframe');
});
it('plays direct files muted with native inline controls after opening', () => {
  const html = renderToStaticMarkup(open('https://media.example/row.mp4'));
  expect(html).toMatch(/<video[^>]*controls=""[^>]*muted=""[^>]*playsInline=""[^>]*autoPlay=""/);
  expect(html).not.toContain('<iframe');
});
it('replaces failed media with a nonblocking warning and lets the user retry', () => {
  const tree = open();
  elements(tree).find(node => node.type === 'iframe')?.props.onError?.();
  const failed = renderToStaticMarkup(render());
  expect(failed).toContain('Video needs internet. You can keep training; everything is saved.');
  expect(failed).not.toContain('<iframe');
  expect(failed).toContain('Try again');
  expect(failed).toContain('href="https://youtube.com/shorts/dQw4w9WgXcQ"');
  elements(render()).find(node => node.props.children === 'Try again')?.props.onClick?.();
  expect(renderToStaticMarkup(render())).toContain('<iframe');
});
it('shows loading until the iframe loads and offers recovery for provider errors', () => {
  const tree = open();
  expect(renderToStaticMarkup(tree)).toContain('Loading video');
  elements(tree).find(node => node.type === 'iframe')?.props.onLoad?.();
  const loaded = render();
  expect(renderToStaticMarkup(loaded)).not.toContain('Loading video');
  elements(loaded).find(node => node.props.children === 'Video not loading?')?.props.onClick?.();
  expect(renderToStaticMarkup(render())).toContain('Video needs internet. You can keep training; everything is saved.');
  expect(renderToStaticMarkup(render())).not.toContain('<iframe');
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h, Fragment } from 'react';
import type * as React from 'react';
import { ExerciseVideo } from './components/exercise-video';
import { ExerciseVideoPreview } from './components/exercise-video-preview-entry';
import { Button } from '@/ui/button';
import { LocaleProvider } from '@/core/i18n/client';

const dialog = vi.hoisted(() => ({ open: false }));

vi.mock('react', async original => ({ ...await original<typeof React>(),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => boolean) => snapshot(),
  useState: (initial: unknown) => [initial === false && dialog.open ? true : initial, vi.fn()],
}));

afterEach(() => { vi.unstubAllGlobals(); dialog.open = false; });
describe('exercise video UI', () => {
  it.each(['ar', 'en'] as const)('keeps a safe YouTube escape and translated footer in the %s dialog', locale => {
    dialog.open = true;
    const html = renderToStaticMarkup(h(LocaleProvider, { locale }, h(ExerciseVideo, { url: 'https://youtu.be/dQw4w9WgXcQ', name: 'Row' })));
    expect(html).toContain('<dialog');
    expect(html).toMatch(/<a[^>]*href="https:\/\/youtu.be\/dQw4w9WgXcQ"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain(locale === 'ar' ? 'افتح على يوتيوب' : 'Open on YouTube');
    expect(html).toContain(locale === 'ar' ? 'ارجع للمجموعة' : 'Back to the set');
  });
  it('shows a fixed-ratio glass play card without fetching media before opening', () => {
    const html = renderToStaticMarkup(h(ExerciseVideo, { url: 'https://youtu.be/dQw4w9WgXcQ', name: 'Row' }));
    expect(html).toContain('aspect-video');
    expect(html).toContain('glass');
    expect(html).toContain('فيديو من الكابتن');
    expect(html).not.toMatch(/<iframe|<video|<img/);
  });
  it('opens external videos safely', () => {
    const html = renderToStaticMarkup(h(ExerciseVideo, { url: 'https://instagram.com/reel/123', name: 'Row' }));
    expect(html).toContain('افتح الفيديو');
    expect(html).toContain('noopener noreferrer');
    expect(html).toContain('انستجرام');
    expect(html).not.toContain('<iframe');
  });
  it('warns offline without disabling set controls', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const html = renderToStaticMarkup(h(Fragment, null, h(ExerciseVideo, { url: 'https://youtu.be/dQw4w9WgXcQ', name: 'Row' }), h(Button, null, 'Set')));
    expect(html).toContain('الفيديو محتاج نت. تقدر تكمّل تمرينك عادي، وكل حاجة بتتحفظ.');
    expect(html).toMatch(/<button(?![^>]* disabled=)[^>]*>Set<\/button>/);
  });
  it.each([
    ['https://youtu.be/dQw4w9WgXcQ', 'هيشتغل جوه KOCHIVO.', 'text-lime'],
    ['https://instagram.com/reel/123', 'اللينك ده هيفتح برا KOCHIVO.', 'text-warn'],
    ['http://example.com/video', 'لينك الفيديو لازم يبدأ بـ https://', 'text-danger'],
  ])('previews form feedback for %s', (url, copy, color) => {
    const html = renderToStaticMarkup(h(ExerciseVideoPreview, { url, name: 'Row' }));
    expect(html).toContain(copy);
    expect(html).toContain(color);
    expect(html).not.toMatch(/<iframe|<video/);
  });
});

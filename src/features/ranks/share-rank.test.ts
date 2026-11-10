import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ShareRankButton, shareRankFile } from './components/share-rank-button';

afterEach(() => vi.unstubAllGlobals());
it.each([['ar', 'شارك'], ['en', 'Share']] as const)('labels the secondary action in %s', (locale, label) => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(ShareRankButton, { kind: 'rank' })));
  expect(html).toContain(label); expect(html).toContain('min-h-12');
  expect(html).not.toContain('bg-lime');
});
it('downloads when file sharing is unsupported and releases the URL', async () => {
  const click = vi.fn(); const revoke = vi.fn();
  vi.stubGlobal('navigator', { canShare: () => false });
  vi.stubGlobal('document', { createElement: () => ({ click, download: '', href: '' }) });
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:card', revokeObjectURL: revoke });
  await shareRankFile(new File(['png'], 'rank.png', { type: 'image/png' }));
  expect(click).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:card');
});
it('shares supported files without downloading', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { canShare: () => true, share });
  const file = new File(['png'], 'rank.png', { type: 'image/png' });
  await shareRankFile(file);
  expect(share).toHaveBeenCalledWith({ files: [file] });
});

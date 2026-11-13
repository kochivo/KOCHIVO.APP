import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { MobileActions } from './components/mobile-actions';
import { WorkspaceHeader } from './components/workspace-header';
import { EditorHeader } from './training/editor-header';

afterEach(() => vi.unstubAllEnvs());

it.each(['0', '1'])('gates engraved add and send actions with flag %s', flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const html = renderToStaticMarkup(createElement(MobileActions, { locale: 'ar' }))
    + renderToStaticMarkup(createElement(WorkspaceHeader, { playerId: 'p', name: 'Ali', locale: 'ar' }))
    + renderToStaticMarkup(createElement(EditorHeader, { template: false, status: 'saved', busy: false,
      disabled: false, onSend() {}, onAssign() {}, onRetry() {} }));
  expect(html.match(/<pattern /g)?.length ?? 0).toBe(flag === '1' ? 4 : 0);
  expect(html.includes('lucide-send')).toBe(flag === '0');
  expect(html.includes('lucide-plus')).toBe(flag === '0');
  expect(html).toContain('aria-label="إضافة تمرين"');
  expect(html).toContain('lucide-chevron-right');
  expect(html).toContain('lucide-cloud-check');
});

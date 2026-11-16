import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { RenewalRequests } from './renewal-requests';

const state = vi.hoisted(() => ({ frozenAt: null as string | null }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: { data: [
  { id: 'request', name: 'Player', package: 'Monthly', frozenAt: state.frozenAt },
] }, retry() {} }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('../data/renewal-requests', () => ({ listRenewalRequests() {}, decideRenewalRequest() {} }));

it('blocks frozen renewal approval with a note and keeps decline available', () => {
  state.frozenAt = '2026-11-01T10:00:00Z';
  const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(RenewalRequests)));
  const html = render();
  expect(html).toContain('Unfreeze the player first');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Approve<\/button>/);
  expect(html).toMatch(/<button(?![^>]*disabled=")[^>]*>Decline<\/button>/);
  state.frozenAt = null;
  expect(render()).not.toContain('disabled=""');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { DeleteAccountCard } from './components/delete-account-card';

vi.mock('./data/settings', () => ({ cancelDeletion: vi.fn(), requestDeletion: vi.fn() }));

it('shows the scheduled deletion date after Cairo midnight', () => {
  const html = renderToStaticMarkup(createElement(DeleteAccountCard, { requestedAt: '2026-10-26T23:30:00Z' }));
  expect(html).toContain('dateTime="2026-11-02T23:30:00.000Z">3 نوفمبر 2026</time>');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CoachButtonView } from './components/coach-button-view';

vi.mock('next/link', () => ({ default: 'a' }));

it('links to chat with a real avatar and the unread message count', () => {
  const html = renderToStaticMarkup(createElement(CoachButtonView, { name: 'هشام', avatarUrl: '/coach.jpg', unread: 2 }));
  expect(html).toContain('href="/player/captain"');
  expect(html).toContain('src="/coach.jpg"');
  expect(html).toContain('data-unread');
  expect(html).toContain('>2</span>');
  expect(html).toContain('الشات مع الكابتن، 2 رسايل مش مقروءة');
  expect(html).toContain('min-h-12');
});

it('uses the coach initial and omits the badge when there are no unread messages', () => {
  const html = renderToStaticMarkup(createElement(CoachButtonView, { name: 'هشام', unread: 0 }));
  expect(html).not.toContain('data-unread');
  expect(html).toContain('>ه</span>');
  expect(html).toContain('aria-label="الشات مع الكابتن"');
});

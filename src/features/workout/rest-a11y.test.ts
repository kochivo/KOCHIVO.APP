import { describe, expect, it } from 'vitest';
import { restAnnouncement } from './rest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrBurst } from './components/pr-burst';

describe('rest announcements', () => {
  it('announces start, the last ten seconds once, then completion', () => {
    const messages = Array.from({ length: 61 }, (_, index) => restAnnouncement(60 - index, true));
    const changes = messages.filter((message, index) => message !== messages[index - 1]);
    expect(changes).toEqual(['بدأت الراحة', 'فاضل ١٠ ثواني أو أقل', 'الراحة خلصت']);
  });
  it('stays silent before starting and after skipping', () => {
    expect(restAnnouncement(0, false)).toBe('');
  });
  it('handles short rests and resuming after the deadline', () => {
    expect(restAnnouncement(5, true)).toBe('فاضل ١٠ ثواني أو أقل');
    expect(restAnnouncement(0, true)).toBe('الراحة خلصت');
  });
});

it('keeps PR decoration hidden with reduced motion and labels dismissal in Arabic', () => {
  const html = renderToStaticMarkup(createElement(PrBurst, {
    pr: { kind: 'weight', previous: { weight_kg: 20, reps: 8 }, current: { weight_kg: 25, reps: 8 } }, onDismiss: () => {},
  }));
  expect(html).toContain('motion-reduce:hidden');
  expect(html).toContain('motion-safe:animate-');
  expect(html).toContain('aria-label="اقفل احتفال الرقم الجديد"');
  expect(html).toContain('role="status"');
});

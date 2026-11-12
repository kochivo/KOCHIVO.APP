import { Children, createElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CheckinList } from './checkin-list';
import { ProgressHistory } from './progress-history';
import { ProgressMediaEntry } from './progress-media-entry';
import type { Profile } from './types';

vi.mock('server-only', () => ({}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
const profile: Profile = { name: 'Ali', intake: null, program: null, nutrition: null, checkIns: [
  { id: 'one', weekStart: '2026-11-12', weightKg: 76.8, waistCm: 82, bodyFatPct: 19, photoPoses: ['front'], photos: ['https://private.test/signed'],
    notes: 'My check-in notes', reviewedAt: null, reply: null, photoError: true },
  { id: 'two', weekStart: '2026-11-05', weightKg: 78, waistCm: null, notes: null, reviewedAt: '2026-11-06', reply: 'Coach reply', photos: [] },
] };
const render = (child: ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, child));
function find(tree: ReactElement, type: unknown): ReactElement<Record<string, unknown>>[] {
  const matches = tree.type === type ? [tree as ReactElement<Record<string, unknown>>] : [];
  for (const child of Children.toArray((tree.props as { children?: React.ReactNode }).children)) {
    if (isValidElement(child)) matches.push(...find(child, type));
  }
  return matches;
}
it('retains check-in notes, review status, replies, measurements and the inbox action', () => {
  const html = render(createElement(CheckinList, { playerId: 'p', profile, locale: 'en' }));
  for (const value of ['76.8', '82', 'My check-in notes', 'Coach reply']) expect(html).toContain(value);
  expect(html.match(/href="\/captain\/inbox"/g)).toHaveLength(1);
  const empty = render(createElement(CheckinList, { playerId: 'p', profile: { ...profile, checkIns: [] }, locale: 'en' }));
  expect(empty).toContain('/captain/players/p/checkins#voice-recorder-p');
});
it('keeps weight/body-fat history, signed photos/poses, photo errors and missing-data reminders', () => {
  const tree = ProgressHistory({ playerId: 'p', profile, locale: 'en', today: '2026-11-12' });
  const media = find(tree, ProgressMediaEntry);
  expect(media[0]?.props.points).toEqual([{ date: '2026-11-05', value: 78 }, { date: '2026-11-12', value: 76.8 }]);
  expect(media[0]?.props.bodyFat).toEqual([{ date: '2026-11-12', value: 19 }]);
  expect(media[1]?.props.weeks).toEqual([
    { date: '2026-11-12', weight: 76.8, photos: [{ url: 'https://private.test/signed', pose: 'front' }] },
    { date: '2026-11-05', weight: 78, photos: [] },
  ]);
  expect(render(tree)).toContain('role="alert"');
  const empty = render(createElement(ProgressHistory, { playerId: 'p', profile: { ...profile, checkIns: [] }, locale: 'en', today: '2026-11-12' }));
  expect(empty).toContain('/captain/players/p/checkins#voice-recorder-p');
});

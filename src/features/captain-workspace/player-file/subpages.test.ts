import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { PlayerCheckins } from './checkins';
import { AssessmentCards } from './assessment-cards';
import type { RequestData } from '@/features/forms';

vi.mock('./profile-section', () => ({ ProfileSection: ({ tab }: { tab: string }) => createElement('div', null, tab) }));
const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

it('keeps analysis and readiness behind labelled, chevron disclosures', () => {
  const html = renderToStaticMarkup(createElement(PlayerCheckins, {
    playerId: 'p', profile: { name: 'Ali', intake: null, checkIns: [], program: null, nutrition: null },
    today: '2026-11-14', locale: 'en',
  }));
  expect(html).toContain('id="analysis"');
  expect(html).toContain('id="readiness"');
  expect(html.match(/lucide-chevron-down/g)).toHaveLength(2);
  expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
  expect(html).toContain('checkins');
});

it('keeps answered assessment links directed to the existing request review', () => {
  const request: RequestData = { title: 'Monthly assessment', questions: [], answers: [], request: {
    id: 'request', form_id: 'form', player_id: 'p', captain_id: 'c', sent_at: '2026-11-01T10:00:00Z',
    answered_at: '2026-11-14T10:00:00Z', due_at: null, reminded_at: null, reviewed_at: null, captain_reply: null, status: null,
  } };
  const answered = renderToStaticMarkup(createElement(AssessmentCards, {
    playerId: 'p', locale: 'en', timezone: 'Africa/Cairo', requests: [request],
  }));
  expect(answered).toContain('Monthly assessment');
  expect(answered).toContain('href="/captain/players/p/assessments?requestId=request#assessment-details"');
  expect(answered).toContain('dir-icon');
  expect(answered).toContain('focus-visible:ring-2');
  const html = renderToStaticMarkup(createElement(AssessmentCards, {
    playerId: 'p', locale: 'en', timezone: 'Africa/Cairo', requests: [],
  }));
  expect(html).toContain('No assessments');
});

it('uses the sheet header and guarded close for changing a player program', () => {
  const sheet = source('../training/player-program-start-entry.tsx');
  expect(sheet).toContain('title={');
  expect(sheet).toContain('onClose={');
  expect(sheet).toContain('footer={');
});

it('keeps meal edits visibly editable and the chat in an inbox-style panel', () => {
  expect(source('../../meal-plans/components/editor/meal-card.tsx')).toContain('EditInPlace');
  expect(source('../../meal-plans/components/editor/player-editor.tsx')).toContain('editableMealNames = false');
  expect(source('../../meal-plans/components/editor/player-editor.tsx')).toContain('editableName={editableMealNames && !template}');
  expect(source('../../meal-plans/components/editor/player-entry.tsx')).toContain('data={data} editableMealNames');
  expect(source('./chat-entry.tsx')).toContain('glass');
  expect(source('../../player-preview/components/preview-screen.tsx')).toContain('PageBarTitle');
});

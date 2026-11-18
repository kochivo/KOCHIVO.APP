import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainHeading } from './components/captain-heading';
import { CaptainPendingAssessment } from './components/captain-pending-assessment';
import { PlayerAssessmentsWorkspace } from './components/player-assessments-workspace';
import { CaptainScreen } from './components/captain-screen';

const state = vi.hoisted(() => ({ v6: true, due: true }));
const captain = { captainId: 'c', fullName: 'Mahmoud', phone: null, accessUntil: '2026-12-01', startedOn: '2026-08-13', archivedAt: null };
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => state.v6 }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T10:00:00Z') }) }));
vi.mock('@/core/offline/db', () => ({ localDb: () => ({ userId: 'p' }) }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'p' }) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status: 'ready', data: state.due ? [{ id: 'a', sent_at: '2026-11-12', answered_at: null, forms: { title: 'Assessment' }, questionCount: 3 }] : [], retry: vi.fn() }) }));
vi.mock('./hooks/use-my-captain', () => ({ useCaptainContext: () => ({ data: captain, status: 'ready', retry: vi.fn() }) }));
vi.mock('./components/captain-profile-card', () => ({ CaptainProfileCard: () => createElement('div', null, 'profile-content'), captainContact: () => ({ url: 'https://wa.me/201012345678' }) }));
vi.mock('./components/captain-chat', () => ({ CaptainChat: () => createElement('div', null, 'real-chat') }));
const render = (component: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, component));
beforeEach(() => { state.v6 = true; state.due = true; });
it('links the chat header back home and to coach details, and retains the assessment banner link', () => {
  const heading = render(createElement(CaptainHeading, { captain }));
  expect(heading).toContain('href="/ar/player/captain/profile"');
  expect(heading).toContain('كابتنك من 3 شهور');
  expect(heading).toContain('href="/ar/player"');
  expect(heading).toContain('aria-label="الكابتن واشتراكك"');
  const banner = render(createElement(CaptainPendingAssessment));
  expect(banner).toContain('href="/ar/player/assessments"');
  expect(banner).toContain('عندك تقييم مطلوب');
  state.due = false;
  expect(render(createElement(CaptainPendingAssessment))).toBe('');
});
it('renders chat instead of profile details, assessment details and WhatsApp in v6, preserving legacy contact and voice', () => {
  const screen = () => render(createElement(CaptainScreen, { voiceNotes: createElement('div', null, 'legacy-voice') }));
  const html = screen();
  expect(html).toContain('real-chat');
  expect(html).not.toContain('<details');
  expect(html).not.toContain('wa.me');
  expect(html).not.toContain('profile-content');
  state.v6 = false;
  expect(screen()).toContain('profile-content');
  expect(screen()).toContain('legacy-voice');
});

it('gives the featured due assessment one destination and a section heading', () => {
  const html = render(createElement(PlayerAssessmentsWorkspace, {
    due: [{ id: 'a', due_at: null, forms: { title: 'Assessment' } }], past: [], actionable: true,
  }));
  expect(html.match(/href="\/ar\/player\/forms\/a"/g)).toHaveLength(1);
  expect(html).toContain('<h2 id="workspace-assessment-due"');
  expect(html).toContain('aria-labelledby="assessment-record-a assessment-title-a"');
});

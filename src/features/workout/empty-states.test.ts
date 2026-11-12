import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { LocaleProvider } from '@/core/i18n/client';
import type { SnapshotDay } from '@/core/offline';
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
 const react = await original<typeof React>();
 return { ...react, useState: (initial: unknown) => {
 const index = state.index++;
 return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
 } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { FocusScreen } from './components/focus-screen';
import { SetDots } from './components/set-dots';
const focus = vi.hoisted(() => ({ day: null as null | { id: string; title: string; cardio?: SnapshotDay['cardio'] } }));
vi.mock('./hooks/use-focus-session', () => ({ useFocusSession: () => ({ day: focus.day, queue: [], doneSets: [], rest: { remaining: 0, endsAt: null } }) }));
vi.mock('./components/media-status', () => ({ MediaStatus: () => null }));
it('puts the home link inside the missing workout state', () => {
 const html = render(createElement(FocusScreen, { dayId: 'missing' }));
 expect(html).toMatch(/href="\/player"[^>]*>Back to home<\/a>/);
 expect(html).toContain('bg-lime');
});
it('links an empty workout to the coach', () => {
 focus.day = { id: 'day', title: 'Day' };
 expect(render(createElement(FocusScreen, { dayId: 'day' }))).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
});
it('links an exercise without sets to the coach', () => {
 const html = render(createElement(SetDots, { exercise: { id: 'e', exercise_id: 'e', position: 1, sets: 0, reps_min: 8, reps_max: 12, rest_seconds: 60,
   superset_group: null, rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Squat', media_path: null }, currentIndex: 1, doneSets: [], onEdit() {} }));
 expect(html).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
});
it('shows prescribed cardio below the workout without asking the coach to prepare exercises', () => {
 focus.day = { id: 'day', title: 'Cardio', cardio: [{ id: 'c', day_id: 'day', position: 1, kind: 'Walk',
   minutes: 20, intensity: 'low', notes: 'Easy pace' }] };
 const html = render(createElement(FocusScreen, { dayId: 'day' }));
 expect(html).toContain('Walk');
 expect(html).toContain('20 minutes');
 expect(html).toContain('Easy pace');
 expect(html).not.toContain('Your coach is preparing your workout');
});

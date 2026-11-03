import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
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
import { CheckinDetail } from './components/checkin-detail';
vi.mock('./hooks/use-inbox-media', () => ({ useInboxMedia: () => ({ urls: [], loading: false, error: false }) }));
it('links missing check-in photos to the player follow-up tab', () => {
 const html = render(createElement(CheckinDetail, { item: { kind: 'checkin', id: 'c', player_id: 'p', player_name: 'Ali', created_at: '2026-11-03T10:00:00Z', week_start: '2026-10-31', body_weight_kg: null, waist_cm: null, notes: null, reviewed_at: null, reply: null } }));
 expect(html).toMatch(/href="\/captain\/players\/p\?tab=checkins"[^>]*>Open player<\/a>/);
});

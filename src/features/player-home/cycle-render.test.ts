import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CyclePanel } from './components/cycle-panel';
import { defaultCycleSettings } from './data/cycle';
import type { CycleData } from './data/cycle';

const state = vi.hoisted(() => ({ data: undefined as CycleData | undefined }));
vi.mock('./hooks/use-cycle', () => ({ useCycle: () => ({ data: state.data }) }));
beforeEach(() => { state.data = { female: true, settings: { ...defaultCycleSettings }, starts: [], overrides: [] }; });
function render(props: { settings?: boolean; workout?: boolean } = {}) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CyclePanel, { playerId: 'player', today: '2026-11-15', ...props })));
}
it('renders nothing for male players or missing intake on home, settings and workout', () => {
  for (const data of [undefined, { female: false, settings: defaultCycleSettings, starts: [], overrides: [] }]) {
    state.data = data;
    for (const props of [{}, { settings: true }, { workout: true }]) expect(render(props)).toBe('');
  }
});
it('asks eligible players once, with both opt-in and decline actions', () => {
  expect(render()).toContain('تحبي تشغّلي متابعة الدورة؟');
  expect(render()).toContain('لا شكرًا');
  if (state.data) state.data.settings.asked_at = '2026-11-14T10:00:00Z';
  expect(render()).toBe('');
});
it('renders seven days, period and today tokens, logging and the daily override', () => {
  state.data = { female: true, settings: { ...defaultCycleSettings, enabled: true, asked_at: '2026-11-14T10:00:00Z' }, starts: ['2026-11-15'], overrides: [] };
  const html = render();
  expect(html.match(/<time /g)).toHaveLength(7);
  for (const text of ['text-rose', 'ring-lime', 'سجلي أول يوم', 'محدش يشوفها غيرك', 'اتمرني عادي']) expect(html).toContain(text);
});

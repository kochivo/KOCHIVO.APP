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
import { PlayerVoiceNotes } from './components/player-voice-notes';
import { CaptainVoiceNotes } from './components/captain-voice-notes';
vi.mock('./components/voice-recorder', () => ({ VoiceRecorder: () => null }));
it('takes a player with no voice notes to a check-in message', () => {
 state.values = [{ status: 'ready', notes: [] }];
 expect(render(createElement(PlayerVoiceNotes))).toMatch(/href="\/player\/progress"[^>]*>Send a check-in<\/a>/);
});
it('offers a captain a recording step when no notes exist', () => {
 state.values = [{ status: 'ready', notes: [] }];
 expect(render(createElement(CaptainVoiceNotes, { playerId: 'p' }))).toMatch(/href="#voice-recorder-p"[^>]*>Record a voice note<\/a>/);
});

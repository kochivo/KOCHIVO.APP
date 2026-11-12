import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { NextTaskCard } from './next-task-card';
import { playerNextTask } from '../next-task';

it.each(['ar', 'en'] as const)('shows a waiting message without an action in %s with the workspace disabled', locale => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  try {
    const task = playerNextTask({ today: '2026-11-12', intakeDone: true, snapshot: null,
      sessions: [], meals: [], mealLogs: [], checkInWeeks: [], voiceNotes: [] });
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(NextTaskCard, { task })));
    expect(html).toContain(locale === 'ar' ? 'الكابتن بيجهزلك برنامجك' : 'Your captain is preparing your plan');
    expect(html).toContain(locale === 'ar' ? 'هنبعتلك إشعار أول ما يبقى جاهز' : 'We&#x27;ll notify you when it&#x27;s ready');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('<button');
  } finally { vi.unstubAllEnvs(); }
});

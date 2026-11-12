import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ViewerTimezoneContext } from '@/core/timezone/client';
import { SmartNotesPanel } from '../smart-notes-panel';

function render(sent: boolean) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(ViewerTimezoneContext, { value: 'Pacific/Kiritimati' }, createElement(SmartNotesPanel, {
      meals: [], planMeals: [{ id: 'a', name: 'A', position: 0, items: [] }, { id: 'b', name: 'B', position: 1, items: [] }],
      targets: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, facts: {}, today: '2026-11-12', sent,
      logs: [{ meal_id: 'a', log_date: '2026-11-12', completed_at: 'x', deleted_at: null },
        { meal_id: 'a', log_date: '2026-11-11', completed_at: 'x', deleted_at: null },
        { meal_id: 'b', log_date: '2026-11-11', completed_at: 'x', deleted_at: null }], onIncrease() {},
    }))));
}
it('renders seven calendar weekdays with full, partial and empty dots and no ISO labels', () => {
  const html = render(true);
  expect(html.match(/data-adherence=/g)).toHaveLength(7);
  expect(html).toContain('data-adherence="full"');
  expect(html).toContain('data-adherence="partial"');
  expect(html).toContain('data-adherence="none"');
  expect(html).toContain('Thu');
  expect(html).not.toContain('2026-11-');
});
it('explains that an unsent draft has no adherence yet', () => {
  const html = render(false);
  expect(html).toContain('This plan has not been sent to the player yet');
  expect(html).not.toContain('data-adherence=');
});

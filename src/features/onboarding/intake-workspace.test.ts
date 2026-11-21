import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { IntakeMoment } from './components/intake-moment';

it('shows the real coach and a single start action in the workspace welcome', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(IntakeMoment, { stage: 'welcome', workspace: true, captainName: 'Coach Sam', onStart() {} })));
  expect(decodeURIComponent(html)).toContain('/brand/logo-compact.png');
  expect(html).toContain('Welcome. Coach Sam is waiting for you');
  expect(html).toContain('grid-cols-3');
  expect(html.match(/\bcontrol-primary\b/g)).toHaveLength(1);
});

it('offers pregnancy only when the player is not male', async () => {
  const { medicalOptionsFor } = await import('./data/intake-schema');
  expect(medicalOptionsFor('male').map(option => option.key)).not.toContain('pregnancy');
  expect(medicalOptionsFor('female').map(option => option.key)).toContain('pregnancy');
  expect(medicalOptionsFor().map(option => option.key)).toContain('pregnancy');
});

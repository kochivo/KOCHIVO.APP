import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { InviteForm } from './components/invite-form';
import { InviteResult } from './components/invite-result';
import type { InvitePackage, PlayerInvite } from './invite-plan';

const pkg: InvitePackage = { id: 'p', name: 'Monthly', kind: 'days', days: 30, sessions: null, price_egp: 500 };
const input: PlayerInvite = { name: 'Ali', whatsapp: '01001234567', packageId: 'p', kind: 'days', quantity: 30,
  price: 400, paid: 150, freeTrial: false, startsOn: '2026-11-03' };
it.each(['ar', 'en'] as const)('renders package cards and custom empty state in %s', locale => {
  for (const packages of [[pkg], []]) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(InviteForm,
      { packages, today: '2026-11-03', onSave() {} })));
    expect(html).toContain('type="date"');
    expect(html).toContain('min="2026-10-04"');
    expect(html).toContain('max="2027-01-02"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain(locale === 'en' ? 'Custom duration and price' : 'مدة وسعر مخصوص');
    if (packages.length) { expect(html).toContain('Monthly'); expect(html).toContain('value="500"'); }
    else { expect(html).toContain('href="/captain/billing'); expect(html).toContain(locale === 'en' ? 'No packages yet' : 'لسه معندكش باقات'); }
  }
});
it.each(['ar', 'en'] as const)('renders summary and correct share destinations in %s', locale => {
  for (const whatsapp of ['', '01001234567']) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(InviteResult,
      { input: { ...input, whatsapp }, pkg, code: 'abc', captainFirstName: 'Omar' })));
    const href = html.match(/href="(https:\/\/wa.me\/[^\"]*)"/)?.[1];
    expect(href).toBeDefined();
    const url = new URL((href ?? '').replaceAll('&#x27;', "'").replaceAll('&amp;', '&'));
    expect(url.pathname).toBe(whatsapp ? '/201001234567' : '/');
    expect(url.searchParams.get('text')).toContain('Omar');
    expect(url.searchParams.get('text')).toContain('https://kochivo.site/i/abc');
    expect(html).toContain('Monthly'); expect(html).toContain('Ali');
    expect(html).toContain('400'); expect(html).toContain('150'); expect(html).toContain('250');
  }
});

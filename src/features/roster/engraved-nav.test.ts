import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { CreditCard, Dumbbell, Inbox, LayoutDashboard, Settings, Users } from 'lucide-react';
import { captainMobileNav, captainNav } from './nav';

afterEach(() => vi.unstubAllEnvs());

it('keeps every legacy captain icon and its markup when the flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const icons = [LayoutDashboard, Users, Inbox, Dumbbell, CreditCard, Settings];
  captainNav('/captain').forEach((item, index) => {
    const Icon = icons[index];
    if (!Icon) throw new Error('Unexpected navigation item');
    expect(item.icon).toBe(Icon);
    expect(renderToStaticMarkup(createElement(item.icon, { 'aria-hidden': true, className: 'size-5' })))
      .toBe(renderToStaticMarkup(createElement(Icon, { 'aria-hidden': true, className: 'size-5' })));
  });
});

it('uses engraved icons for all desktop and mobile captain destinations', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const desktop = captainNav('/captain/library/forms');
  expect(desktop).toHaveLength(10);
  for (const item of [...desktop, ...captainMobileNav('/captain')]) {
    expect(renderToStaticMarkup(createElement(item.icon))).toContain('<pattern');
  }
  expect(desktop.find(item => item.active)?.href).toBe('/captain/library/forms');
});

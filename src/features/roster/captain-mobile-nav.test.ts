import { describe, expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { captainMobileNav, captainNav } from './nav';

const destinations = ['/captain', '/captain/players', '/captain/templates', '/captain/inbox'];

describe('captain mobile destinations', () => {
  it.each(['ar', 'en'] as const)('shows four main destinations in the requested order in %s', locale => {
    const items = captainMobileNav('/captain', createT(messages, locale));
    expect(items.map(item => item.href)).toEqual(destinations);
    expect(items.map(item => item.label)).toEqual(locale === 'ar'
      ? ['الرئيسية', 'اللاعبين', 'البرامج', 'المهام'] : ['Home', 'Players', 'Programs', 'Tasks']);
  });

  it.each([
    ['/captain', '/captain'],
    ['/captain/players/player?tab=plan', '/captain/players'],
    ['/captain/programs/program', '/captain/players'],
    ['/captain/templates', '/captain/templates'],
    ['/captain/inbox', '/captain/inbox'],
  ])('retains the correct active destination for %s', (path, expected) => {
    expect(captainMobileNav(path).filter(item => item.active).map(item => item.href)).toEqual([expected]);
  });

  it('keeps payments and settings available in the desktop navigation only', () => {
    expect(captainNav('/captain/settings').map(item => item.href)).toEqual([
      '/captain', '/captain/players', '/captain/inbox', '/captain/templates', '/captain/billing', '/captain/settings',
    ]);
    expect(captainMobileNav('/captain/settings').filter(item => item.active)).toEqual([]);
    expect(captainMobileNav('/captain/billing').filter(item => item.active)).toEqual([]);
  });
});

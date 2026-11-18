import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBillingTiles } from './workspace-billing-tiles';
import { WorkspacePaymentsTable } from './workspace-payments-table';
import { WorkspaceTierCard } from './workspace-tier-card';
import { ArchivedTiers } from '../tiers/archived-tiers';
import { TierStatusConfirm } from '../tiers/tier-status-confirm';
import { catalogFixture } from '../tiers/catalog-fixture';
import type { BillingPlayer } from '../types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(
  createElement(LocaleProvider, { locale: 'en' }, element));
const player: BillingPlayer = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-20', due: 0,
  phone: null, lastPayment: null, startedOn: '2026-11-01', lastTrainingDate: null, programTitle: null,
  openTasks: 0, status: 'active' };

it('groups collected, owed, active and ending totals in one strip', () => {
  const html = render(createElement(WorkspaceBillingTiles, {
    values: { income: 4500, pending: 2, ending: 3, active: 8 }, owed: 1200,
  }));
  expect(html).toContain('hairline-cells');
  for (const value of ['4,500', '1,200', '>8<', '>3<']) expect(html).toContain(value);
  expect(html).not.toContain('<svg');
});

it('keeps subscriptions in one glass list with five filters and a package status', () => {
  const html = render(createElement(WorkspacePaymentsTable, { players: [player], packages: [], today: '2026-11-17' }));
  expect(html).toContain('role="group"');
  expect(html.match(/aria-pressed=/g)).toHaveLength(5);
  expect(html).toContain('tone-neutral');
  expect(html).toContain('min-h-16');
  expect(html).toContain('Ali');
  expect(html).toContain('No package');
});

it('leads with real duration prices before included features and retains all editors', () => {
  const tier = catalogFixture.tiers[0];
  if (!tier) throw new Error('Missing tier fixture');
  const html = render(createElement(WorkspaceTierCard, { tier, packages: catalogFixture.packages,
    busy: false, onEdit() {}, onPackage() {}, onFeature() {}, onArchive() {}, count: 4 }));
  expect(html).toContain('glass-featured');
  expect(html).toContain('tone-lime');
  expect(html).toContain('text-stat');
  expect(html.indexOf('2,500')).toBeLessThan(html.indexOf('Weekly call'));
  expect(html).toContain('4 players');
  expect(html.match(/<button/g)).toHaveLength(6);
  expect(html).toContain('aria-label="Options for VIP"');
  for (const action of ['Edit package', 'Add duration', 'Remove most popular']) expect(html).toContain(action);
  expect(html).toMatch(/border-t border-line-soft[^]*text-danger![^]*Archive package/);
  expect(html).not.toContain('Delete permanently');
  expect(html).not.toContain('control-primary');
});

it('shows archived packages with dates, subscriber counts and restore controls', () => {
  const html = render(createElement(ArchivedTiers, {
    tiers: [{ id: 'old', name: 'Old package', archived_at: '2026-11-18T00:00:00Z', current: 2, past: 3 },
      { id: 'unused', name: 'Unused package', archived_at: '2026-11-17T00:00:00Z', current: 0, past: 0, canDelete: true }],
    busy: false, onRestore() {}, onDelete() {},
  }));
  expect(html).toContain('<details');
  expect(html).toContain('Archived packages');
  expect(html).toContain('Old package');
  expect(html).toMatch(/Archived [^·]*2026 · 2 current · 3 past/);
  expect(html).toContain('>Restore</button>');
  expect(html.match(/>Delete permanently<\/button>/g)).toHaveLength(1);
  expect(html.indexOf('Delete permanently')).toBeGreaterThan(html.indexOf('Unused package'));
});

it('renders the exact Egyptian archive confirmation and current subscriber count', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(TierStatusConfirm, {
    kind: 'archive', name: 'Pro', count: 5, busy: false, error: '', onCancel() {}, onConfirm() {},
  })));
  expect(html).toContain('role="alertdialog"');
  for (const copy of ['أرشف باقة Pro؟', 'الـ 5 لاعبين المشتركين فيها هيكملوا عادي لحد ما اشتراكهم يخلص.',
    'مش هتظهر للاعبين الجداد ولا في صفحتك العامة.', 'تقدر ترجّعها في أي وقت من الباقات المؤرشفة.', 'لأ، سيبها', 'أرشفها']) {
    expect(html).toContain(copy);
  }
});

it('explains that permanent deletion cannot be undone', () => {
  const html = render(createElement(TierStatusConfirm, {
    kind: 'delete', name: 'Unused', busy: false, error: '', onCancel() {}, onConfirm() {},
  }));
  expect(html).toContain('Permanently delete Unused?');
  expect(html).toContain('You cannot undo this.');
  expect(html).toContain('Keep package');
});

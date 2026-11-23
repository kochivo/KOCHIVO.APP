import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PackagesCard } from './components/packages-card';
import { WorkspaceTierCard } from './components/workspace-tier-card';
import { TierCard } from './tiers/tier-card';
import { DurationArchiveConfirm } from './tiers/duration-archive-confirm';
import { catalogFixture } from './tiers/catalog-fixture';
import type { CatalogPackage } from './tiers/types';

vi.mock('./data/finance-actions', () => ({ createPackage: vi.fn(), archivePackage: vi.fn() }));
vi.mock('./data/freeze-settings', () => ({ loadFreezeSettings: vi.fn(), saveFreezeSettings: vi.fn() }));
const month = catalogFixture.packages[0];
const tier = catalogFixture.tiers[0];
if (!month || !tier) throw new Error('Missing catalog fixture');
const noop = () => {};
it('shows the named duration and consequence in a separate alert dialog', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(DurationArchiveConfirm, {
    name: 'One month', busy: false, error: '', onCancel: noop, onConfirm: noop,
  })));
  expect(html).toContain('role="alertdialog"');
  expect(html).toContain('Archive One month?');
  expect(html).toContain('This duration will disappear from new subscription options.');
  expect(html).toContain('Keep duration');
});
function editor(packages: CatalogPackage[], item?: CatalogPackage) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(PackagesCard, {
    packages: [], onChange: noop, initialAdding: true,
    editor: { packages, item, tierId: 'vip', tiers: catalogFixture.tiers, tierLabel: 'Tier', noTierLabel: 'None', saveLabel: 'Save', save: async () => true },
  })));
}
it('preselects quarter after month and explains disabled presets', () => {
  const html = editor([month]);
  expect(html).toMatch(/aria-pressed="true"[^>]*>٣ شهور<\/button>/);
  expect(html).toContain('aria-describedby="duration-used"');
  expect(html).toContain('المدة دي موجودة في الفئة. عدّل سعرها بدل ما تضيف واحدة تانية');
  expect(html).not.toContain('value="90"');
});
it('keeps saved presets and custom numeric durations when editing', () => {
  expect(editor([month], month)).toMatch(/aria-pressed="true"[^>]*>شهر واحد<\/button>/);
  expect(editor([month], { ...month, days: 45 })).toContain('value="45"');
});
it('blocks the existing duplicate in the editor and marks every duplicate row in both cards', () => {
  const packages = [month, { ...month, id: 'duplicate', price_egp: 500 }];
  expect(editor(packages, month)).toContain('role="alert"');
  for (const component of [
    createElement(WorkspaceTierCard, { tier, packages, busy: false, onEdit: noop, onPackage: noop, onFeature: noop, onArchive: noop }),
    createElement(TierCard, { tier, packages, busy: false, count: 0, onEdit: noop, onPackage: noop, onFeature: noop, onMove: noop, onArchive: noop }),
  ]) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, component));
    expect(html.match(/مدتين بنفس الطول، اللاعب هيشوف واحدة بس/g)).toHaveLength(2);
    expect(html.match(/>عدّل<\/span>/g)).toHaveLength(2);
  }
});

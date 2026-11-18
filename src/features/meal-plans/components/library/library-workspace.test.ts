import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { LibraryFood } from '../../data/library-types';
import { LibraryWorkspace } from './library-workspace';

const resource = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: resource.read }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ error: vi.fn() }) }));
vi.mock('../../data/library-v2', () => ({ loadFoodLibrary: vi.fn(), setFoodFavorite: vi.fn() }));

const food: LibraryFood = {
  id: 'a', name: 'فول', nameEn: 'Fava beans', region: 'eg', custom: false,
  photo: null, kcal: 110, protein: 8, carbs: 15, fat: 1, uses: 0,
};

function render(locale: 'en' | 'ar' = 'en') {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(LibraryWorkspace)));
}

afterEach(() => vi.unstubAllEnvs());

it.each(['idle', 'loading'])('shows labels and skeletons without digits while %s', status => {
  resource.read.mockReturnValue({ status });
  const html = render('ar');
  const visibleText = html.replace(/<[^>]+>/g, '');
  expect(visibleText).toContain('بنجيب الأكلات...');
  expect(visibleText).not.toMatch(/\p{Nd}/u);
  expect(html).toContain('aria-busy="true"');
  expect(html.match(/<li\b/g)).toHaveLength(6);
  expect(html).toMatch(/role="radiogroup"[^>]*overflow-x-auto/);
  expect(html.match(/role="radio"/g)).toHaveLength(4);
});

it('uses standard Arabic loading copy when international Arabic is enabled', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  resource.read.mockReturnValue({ status: 'loading' });
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: 'standard' }, createElement(LibraryWorkspace)));
  expect(html).toContain('جارٍ تحميل الأطعمة...');
});

it('puts loaded counts in the four selectors', () => {
  resource.read.mockReturnValue({ status: 'ready', data: {
    foods: [food, { ...food, id: 'b', custom: true, region: 'intl' }, { ...food, id: 'c' }],
    favorites: ['a'],
  } });
  const html = render();
  expect(html).not.toContain('Loading foods');
  const tabs = html.match(/role="radio"[^>]*>[^<]+<\/button>/g) ?? [];
  expect(tabs.map(tab => tab.replace(/^.*?>|<\/button>$/g, ''))).toEqual([
    'All 3', 'Egyptian 2', 'My foods 1', 'Favorites 1',
  ]);
  expect(html).not.toContain('hairline-cells');
  expect(html).toContain('aria-label="Table" aria-pressed="true"');
  expect(html).toContain('aria-label="Cards" aria-pressed="false"');
  expect(html).toContain('Plans using this food: 0');
});

it('renders the existing empty state and real zero counts after loading', () => {
  resource.read.mockReturnValue({ status: 'ready', data: { foods: [], favorites: [] } });
  const html = render();
  expect(html).toContain('Your library is empty. Add your first food');
  expect(html).toContain('All 0');
  expect(html).not.toContain('aria-busy="true"');
});

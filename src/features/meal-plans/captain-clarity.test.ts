import { createElement } from 'react';
import type { ReactElement } from 'react';
import type * as DialogModule from '@/ui/responsive-dialog';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CustomFoodSheet } from './components/custom-food-sheet';
import { WorkspaceError } from '../dashboard/components/workspace-error';
import { CaptainAccountContent } from '../roster/components/captain-account-content';
import { FileState } from '../captain-workspace/player-file/file-state';
import { LibraryMenu } from '../templates/components/library-menu';
import { CrownPrizeEditor } from '../rank-review/components/crown-prize-editor';
import { SupplementEditor } from '../supplements/components/supplement-editor';
import { FoodDrawer } from './components/library/food-drawer';

const dialog = vi.hoisted(() => ({ modal: false }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
vi.mock('./data/custom-food-photo', () => ({ saveCustomFood: vi.fn() }));
vi.mock('./data/food-library', () => ({ checkFoodDuplicate: vi.fn(), deleteLibraryFood: vi.fn() }));
vi.mock('@/ui/responsive-dialog', async original => {
  const { ResponsiveDialog } = await original<typeof DialogModule>();
  return { ResponsiveDialog: (props: Parameters<typeof ResponsiveDialog>[0]) => {
    dialog.modal = props.modal === true;
    return createElement(ResponsiveDialog, props);
  } };
});
afterEach(() => vi.unstubAllEnvs());
function render(child: ReactElement) {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, child));
}
function control(html: string, label: string) {
  return html.match(new RegExp('<(?:button|a)[^>]*>[^<]*' + label + '</(?:button|a)>'))?.[0] ?? '';
}
it('keeps the food form in the top layer and its save action scrollable', () => {
  const html = render(createElement(CustomFoodSheet, { openerId: 'food', onClose() {}, onSave() {} }));
  expect(dialog.modal).toBe(true);
  expect(html).toContain('max-h-[90dvh]');
  expect(html).toContain('overflow-y-auto');
  expect(html).toContain('type="submit"');
  expect(html.match(/<button[^>]*aria-label="Close"[^>]*>/)?.[0]).toContain('glass');
});
it('surfaces the captain home retry', () => {
  expect(control(render(createElement(WorkspaceError)), 'Try again')).toContain('glass');
});
it('surfaces both roster account destinations', () => {
  const html = render(createElement(CaptainAccountContent, { onNavigate: () => undefined }));
  for (const href of ['settings', 'billing']) expect(html.match(new RegExp('<a[^>]*href="/captain/' + href + '"[^>]*>'))?.[0]).toContain('glass');
});
it('surfaces the player file retry', () => {
  expect(control(render(createElement(FileState, { locale: 'en', error: true, href: '/retry' })), 'Retry')).toContain('glass');
});
it('surfaces library actions and marks destructive actions', () => {
  const html = render(createElement(LibraryMenu, {
    template: { id: 't', title: 'Plan', kind: 'program', count: 1, created_at: '', starter: false, uses: 0 },
    busy: false, onPreview() {}, onAssign() {}, onCopy() {}, onRename() {}, onDelete() {}, onArchive() {},
  }));
  // Items sit on one solid panel; glass items inside glass lose their blur and let rows show through.
  expect(html).toContain('bg-surface-raised');
  expect(control(html, 'Preview')).not.toContain('glass');
  expect(html).toContain('border-danger');
});
it('surfaces the follow-up prize action', () => {
  const html = render(createElement(CrownPrizeEditor, { locale: 'en', prize: null, async onSave() {} }));
  expect(html.match(/<button[^>]*>/)?.[0]).toContain('glass');
});
it('keeps the food library editing form modal and deletion visibly destructive', () => {
  const html = render(createElement(FoodDrawer, {
    food: { id: 'f', name: 'Rice', custom: true, photo: null, kcal: 100, protein: 2, carbs: 20, fat: 1, uses: 0 },
    onClose() {}, onSaved() {},
  }));
  expect(dialog.modal).toBe(true);
  expect(control(html, 'Delete food')).toContain('glass');
  expect(control(html, 'Delete food')).toContain('border-danger');
});
it('surfaces the supplement editor cancel action', () => {
  const html = render(createElement(SupplementEditor, { initial: null, onClose() {}, async onSave() {} }));
  expect(control(html, 'Cancel')).toContain('glass');
});

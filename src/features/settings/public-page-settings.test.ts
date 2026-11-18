import { beforeEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';
import { PublicPageSettings } from './components/public-page-settings';
import { PublicSpecialtyEditor } from './components/public-specialty-editor';
import { WorkspacePageCard } from './components/workspace-page-card';
import { SaveBar } from './components/captain/save-bar';
import { savePublicPage } from './data/public-page';
import { saveCaptainWithAvatar } from './data/captain-avatar';
import { messages } from './public-page/messages';
import { createT } from '@/core/i18n/messages';
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[i], (next: unknown) => { hooks.slots[i] = next; }];
  },
  useRef: (initial: unknown) => {
    const i = hooks.cursor++;
    hooks.slots[i] ??= { current: initial };
    return hooks.slots[i];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: (dictionary: typeof messages) => createT(dictionary, 'en') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
vi.mock('./data/captain-avatar', () => ({ saveCaptainWithAvatar: vi.fn() }));
vi.mock('./data/public-page', () => ({ savePublicPage: vi.fn() }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
const profile = { id: 'coach', role: 'captain' as const, full_name: 'Ali', phone: null,
  invite_message: null, deletion_requested_at: null, public_slug: 'ali', specialties: ['Strength'],
  years_experience: 8, languages: ['ar' as const], show_public_stats: false };
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); });
it('shows saved values, the five-player explanation, package and live preview links', () => {
  const tree = PublicPageSettings({ profile, onSave: vi.fn() });
  const all = nodes(tree);
  expect(all.find(node => node.type === WorkspacePageCard)?.props.slug).toBe('ali');
  expect(all.some(node => node.props.href === '/captain/billing/packages')).toBe(true);
  expect(all.some(node => node.props.children === messages.en.minimum)).toBe(true);
  expect(all.find(node => node.props.role === 'switch')?.props['aria-checked']).toBe(false);
  expect(all.find(node => node.props.type === 'number')?.props.value).toBe(8);
});
it('optimistically saves, prevents duplicate submissions and restores fields on failure', async () => {
  let finish: (value: { ok: boolean }) => void = () => {};
  vi.mocked(savePublicPage).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const update = vi.fn();
  const render = () => { hooks.cursor = 0; return PublicPageSettings({ profile, onSave: update }); };
  const initial = render();
  const toggle = nodes(initial).find(node => node.props.role === 'switch')?.props.onClick as () => void;
  expect(nodes(initial).find(node => node.type === SaveBar)?.props.dirty).toBe(false);
  toggle();
  expect(nodes(render()).find(node => node.type === SaveBar)?.props.dirty).toBe(true);
  const submit = render()?.props.onSubmit;
  const task = submit({ preventDefault() {} });
  await submit({ preventDefault() {} });
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ show_public_stats: true }));
  expect(savePublicPage).toHaveBeenCalledTimes(1);
  expect(nodes(render()).some(node => node.type === 'fieldset' && node.props.disabled)).toBe(true);
  finish({ ok: false }); await task;
  expect(update).toHaveBeenLastCalledWith(profile);
  expect(nodes(render()).find(node => node.props.role === 'switch')?.props['aria-checked']).toBe(false);
  expect(nodes(render()).find(node => node.props.role === 'alert')?.props.children).toBe(messages.en.rollback);
});
it('keeps successful edits and hides the block completely when the flag is off', async () => {
  vi.mocked(savePublicPage).mockResolvedValue({ ok: true });
  const update = vi.fn();
  const render = () => { hooks.cursor = 0; return PublicPageSettings({ profile, onSave: update }); };
  const toggle = nodes(render()).find(node => node.props.role === 'switch')?.props.onClick as () => void;
  toggle();
  await render()?.props.onSubmit({ preventDefault() {} });
  expect(nodes(render()).find(node => node.props.role === 'status')?.props.children).toBe(messages.en.saved);
  expect(nodes(render()).find(node => node.type === SaveBar)?.props.dirty).toBe(false);
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(render()).toBeNull();
});
it('removes chips by index and disables additions at six specialties', () => {
  const change = vi.fn();
  const items = Array<string>(6).fill('Strength');
  const all = nodes(PublicSpecialtyEditor({ items, onChange: change }));
  expect(all.find(node => node.props.children === messages.en.add)?.props.disabled).toBe(true);
  const remove = all.find(node => node.props['aria-label'] === 'Remove Strength')?.props.onClick as () => void;
  remove(); expect(change).toHaveBeenCalledWith(items.slice(1));
});

it('resets page edits and saves bio and slug through the existing captain profile action', async () => {
  const update = vi.fn();
  const render = () => { hooks.cursor = 0; return PublicPageSettings({ profile, onSave: update }); };
  const initial = nodes(render());
  const toggle = initial.find(node => node.props.role === 'switch')?.props.onClick as () => void;
  toggle();
  const reset = nodes(render()).find(node => node.type === SaveBar)?.props.onReset as () => void;
  reset();
  expect(nodes(render()).find(node => node.type === SaveBar)?.props.dirty).toBe(false);

  const bio = initial.find(node => node.type === 'textarea')?.props.onChange as (event: unknown) => void;
  const slug = initial.find(node => node.props.value === 'ali')?.props.onChange as (event: unknown) => void;
  bio({ target: { value: 'Strength coach' } });
  slug({ target: { value: 'coach-ali' } });
  vi.mocked(saveCaptainWithAvatar).mockResolvedValue({ data: { ...profile, bio: 'Strength coach', public_slug: 'coach-ali' } });
  await render()?.props.onSubmit({ preventDefault() {} });
  expect(saveCaptainWithAvatar).toHaveBeenCalledWith(expect.objectContaining({ bio: 'Strength coach', public_slug: 'coach-ali' }), null, expect.any(Function));
  expect(savePublicPage).not.toHaveBeenCalled();
  expect(nodes(render()).find(node => node.type === WorkspacePageCard)?.props.slug).toBe('coach-ali');
  expect(nodes(render()).find(node => node.type === SaveBar)?.props.dirty).toBe(false);
});

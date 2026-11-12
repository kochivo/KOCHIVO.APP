import { createElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CaptainProfileCard } from './components/captain-profile-card';
import { CaptainProfileFields } from './components/captain-profile-fields';
import { PublicSlugField } from './components/public-slug-field';
import { AvatarPicker } from './components/avatar-picker';
import { arStd } from './standard/messages';
import type { CaptainProfileInput, SettingsProfile } from './schema';

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, save: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [state.slots[index], (next: unknown) => { state.slots[index] = typeof next === 'function' ? next(state.slots[index]) : next; }];
  },
  useRef: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: initial };
    return state.slots[index];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success, error: state.error }) }));
vi.mock('./data/captain-avatar', () => ({ saveCaptainWithAvatar: state.save, captainAvatarUrl: vi.fn() }));
const profile: SettingsProfile = { id: 'captain', role: 'captain', full_name: 'Ali', phone: null,
  public_slug: 'ali', bio: 'Original', invite_message: null, deletion_requested_at: null };
const onSave = vi.fn();
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render(quiet = true) { state.cursor = 0; return CaptainProfileCard({ profile, onSave, quiet }); }
function fields(quiet = true) {
  const node = nodes(render(quiet)).find(node => node.type === CaptainProfileFields);
  if (!node) throw new Error('Missing profile fields');
  return node.props as { value: CaptainProfileInput; errors: Record<string, string>; onChange: (value: CaptainProfileInput) => void };
}
beforeEach(() => { vi.clearAllMocks(); state.slots = []; state.cursor = 0; });
it.each([true, false])('retains every edit and renders a duplicate slug inline, quiet=%s', async quiet => {
  const edited = { ...fields(quiet).value, public_slug: 'taken', full_name: 'New name', bio: 'New bio',
    location: 'Giza', units: 'imperial' as const, social: { whatsapp: '+201012345678' } };
  fields(quiet).onChange(edited);
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  const avatar = nodes(render(quiet)).find(node => node.type === AvatarPicker);
  if (!avatar) throw new Error('Missing avatar picker');
  (avatar.props.onChange as (file: File) => void)(file);
  const error = 'This link is taken. Choose another link';
  state.save.mockResolvedValue({ error, fieldErrors: { public_slug: error } });
  await render(quiet).props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  expect(fields(quiet).value).toEqual(edited);
  expect(fields(quiet).errors).toEqual({ public_slug: error });
  expect(nodes(render(quiet)).find(node => node.type === AvatarPicker)?.props.file).toBe(file);
  expect(state.error).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
  const html = renderToStaticMarkup(createElement(PublicSlugField, { value: edited.public_slug, error: fields(quiet).errors.public_slug, onChange() {} }));
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain(error);
  expect(html).toContain('role="alert"');
  fields(quiet).onChange({ ...edited, public_slug: 'available' });
  state.save.mockResolvedValue({ data: { ...profile, ...edited, public_slug: 'available' } });
  await render(quiet).props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ full_name: edited.full_name, public_slug: 'available' }));
  expect(fields(quiet).errors).toEqual({});
});
it('rolls back real failures as before', async () => {
  fields(false).onChange({ ...fields(false).value, full_name: 'Changed' });
  state.save.mockResolvedValue({ error: 'Network failed' });
  await render(false).props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  expect(fields(false).value.full_name).toBe('Ali');
  expect(onSave).toHaveBeenLastCalledWith(profile);
  expect(state.error).toHaveBeenCalledWith(createT(messages, 'en')('rolledBack'));
});
it('keeps Egyptian and standard rollback copy distinct', () => {
  expect(messages.ar.rolledBack).toBe('الحفظ متعملش ورجّعنا البيانات القديمة. جرّب تاني');
  expect(arStd.rolledBack).toBe('تعذّر الحفظ وتمت استعادة البيانات السابقة. حاول مجدداً');
  expect(messages.ar.slugTaken).toBe('الرابط ده محجوز، اختار رابط تاني');
  expect(arStd.slugTaken).toBe('هذا الرابط محجوز، اختر رابطًا آخر');
});

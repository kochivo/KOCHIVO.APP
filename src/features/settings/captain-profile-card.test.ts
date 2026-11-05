import { beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CaptainProfileCard } from './components/captain-profile-card';
import type { SettingsProfile } from './schema';

const mock = vi.hoisted(() => ({ save: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }), useEffect: () => {},
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: mock.success, error: mock.error }) }));
vi.mock('./data/captain-avatar', () => ({ saveCaptainWithAvatar: mock.save, captainAvatarUrl: vi.fn() }));
const profile: SettingsProfile = { id: 'captain', role: 'captain', full_name: 'Ali', phone: null,
  invite_message: null, deletion_requested_at: null };
beforeEach(() => vi.clearAllMocks());

it('applies the profile immediately, prevents duplicate saves, and rolls back on failure', async () => {
  let reject: (error: Error) => void = () => {};
  mock.save.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  const onSave = vi.fn();
  const form = CaptainProfileCard({ profile, onSave });
  const event = { preventDefault() {} } as React.FormEvent<HTMLFormElement>;
  const request = form.props.onSubmit(event);
  await form.props.onSubmit(event);
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(mock.save).toHaveBeenCalledTimes(1);
  expect(onSave.mock.calls[0]?.[0]).toMatchObject({ full_name: 'Ali', units: 'metric' });
  reject(new Error('failed')); await request;
  expect(onSave).toHaveBeenLastCalledWith(profile);
  expect(mock.error).toHaveBeenCalledWith('Save failed. Your previous details were restored. Try again');
  expect(mock.success).not.toHaveBeenCalled();
});
it('keeps the saved response and announces success', async () => {
  const updated = { ...profile, bio: 'Coach' };
  mock.save.mockResolvedValue({ data: updated });
  const onSave = vi.fn();
  await CaptainProfileCard({ profile, onSave }).props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  expect(onSave).toHaveBeenLastCalledWith(updated);
  expect(mock.success).toHaveBeenCalledWith('Saved');
  expect(mock.error).not.toHaveBeenCalled();
});

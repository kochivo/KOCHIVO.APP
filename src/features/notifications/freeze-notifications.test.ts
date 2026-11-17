import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { notificationHref, notificationTextKey } from './format';
import { messages } from './messages';
import { notificationTypes } from '@/types/enums';
import type { Notification } from './types';

it.each(['freeze_requested', 'freeze_approved', 'freeze_declined'] as const)('translates and routes %s in all styles', type => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  try {
    expect(notificationTypes).toContain(type);
    const row = { id: 'notice', type, payload: { player_id: 'player', display_name: 'Actor' },
      is_read: false, created_at: '2026-11-17T10:00:00Z' } as Notification;
    expect(notificationHref(row)).toBe(type === 'freeze_requested' ? '/captain/billing' : '/player');
    for (const locale of ['ar', 'en'] as const) for (const style of ['egyptian', 'standard'] as const) {
      expect(createT(messages, locale, style)(notificationTextKey(row), { name: row.payload.display_name ?? '' })).toContain('Actor');
    }
  } finally { vi.unstubAllEnvs(); }
});

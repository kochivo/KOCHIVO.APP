import { z } from 'zod';
import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import { messages } from './messages';

export function settingsSchemas(t: Translator<typeof messages> = createT(messages, 'ar')) {
  const profileSchema = z.object({
    full_name: z.string().trim().min(1, t('enterYourName')).max(80, t('nameMustBe80CharactersOr')),
    phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/, t('useAnInternationalNumberLike201012345678')),
  });

  const inviteMessageSchema = z.object({
    invite_message: z.string().max(500, t('messageMustBe500CharactersOr')),
  });
  return { profileSchema, inviteMessageSchema };
}

export const { profileSchema, inviteMessageSchema } = settingsSchemas();

export function deletionDate(requestedAt: string): string {
  return new Date(Date.parse(requestedAt) + 7 * 86_400_000).toISOString();
}

export type SettingsProfile = {
  id: string;
  role: 'captain' | 'player';
  full_name: string;
  phone: string | null;
  invite_message: string | null;
  deletion_requested_at: string | null;
};

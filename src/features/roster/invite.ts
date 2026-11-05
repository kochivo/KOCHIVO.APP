import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';

import { z } from 'zod';

export const inviteDaysSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);

export function inviteUrl(code: string): string {
  return `https://kochivo.site/i/${code}`;
}

export function inviteMessage(captainFirstName: string, url: string, t: Translator<typeof messages> = createT(messages, 'ar')): string {
  return t('coachInvitesYouToKOCHIVOOpenThis', { v0: captainFirstName, v1: url });
}

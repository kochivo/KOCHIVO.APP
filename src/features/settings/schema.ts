import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'اكتب اسمك').max(80, 'الاسم طويل، آخره ٨٠ حرف'),
  phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/, 'اكتب الرقم بالصيغة الدولية زي +201012345678'),
});

export const inviteMessageSchema = z.object({
  invite_message: z.string().max(500, 'الرسالة آخرها ٥٠٠ حرف'),
});

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

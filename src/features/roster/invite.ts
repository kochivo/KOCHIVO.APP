import { z } from 'zod';

export const inviteDaysSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);

export function inviteUrl(code: string): string {
  return `https://kochivo.site/i/${code}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function inviteMessage(captainFirstName: string, url: string): string {
  return `كابتن ${captainFirstName} بيدعوك تبدأ معاه على كوتشيفو. افتح اللينك: ${url}`;
}

import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import type { CaptainProfileInput, SettingsProfile } from '../../schema';

export function captainProfileValues(profile: SettingsProfile): CaptainProfileInput {
  return { full_name: profile.full_name, bio: profile.bio ?? '', location: profile.location ?? '',
    coach_gender: profile.coach_gender ?? null, public_slug: profile.public_slug ?? '',
    timezone: profile.timezone ?? DEFAULT_TIMEZONE, units: profile.units ?? 'metric',
    ...(internationalEnabled() ? { timezone_auto: profile.timezone_auto ?? true } : {}),
    social: profile.social ?? {}, avatar_path: profile.avatar_path ?? null };
}

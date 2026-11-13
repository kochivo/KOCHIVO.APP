import type { Translator } from '@/core/i18n/messages';
import type { loadPublicCoach } from '../data/public-profile';
import type { messages } from '../messages';

export type PublicCoach = NonNullable<Awaited<ReturnType<typeof loadPublicCoach>>>;
export type PublicT = Translator<typeof messages>;

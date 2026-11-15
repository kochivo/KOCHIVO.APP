import type { Translator } from '@/core/i18n/messages';
import type { loadPublicCoach } from '../data/public-profile';
import type { messages } from '../messages';

type LoadedCoach = NonNullable<Awaited<ReturnType<typeof loadPublicCoach>>>;
export type PublicCoach = Omit<LoadedCoach, 'page' | 'stats' | 'coach_gender'> & Partial<Pick<LoadedCoach, 'page' | 'stats' | 'coach_gender'>>;
export type PublicT = Translator<typeof messages>;

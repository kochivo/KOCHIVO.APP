import { getLocale, getT } from '@/core/i18n/server';
import { homeV11Messages } from './messages';
import type { HomeTask } from './tasks';
import { HomeHeroView } from './home-hero-view';

export async function HomeHero(props: { tasks: HomeTask[]; count: number; completed: number; adherence: number }) {
  const [t, locale] = await Promise.all([getT(homeV11Messages), getLocale()]);
  return <HomeHeroView {...props} t={t} locale={locale} />;
}

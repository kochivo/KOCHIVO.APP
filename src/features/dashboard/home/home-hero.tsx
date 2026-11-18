import { getArabicStyle, getLocale, getT } from '@/core/i18n/server';
import { homeV11Messages } from './messages';
import type { HomeTask } from './tasks';
import { HomeHeroView } from './home-hero-view';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function HomeHero(props: { tasks: HomeTask[]; count: number; completed: number; adherence: number }) {
  const phone = captainWorkspaceEnabled();
  const [t, locale, style] = await Promise.all([getT(homeV11Messages), getLocale(), phone ? getArabicStyle() : undefined]);
  return <HomeHeroView {...props} t={t} locale={locale} phone={phone} style={style} />;
}

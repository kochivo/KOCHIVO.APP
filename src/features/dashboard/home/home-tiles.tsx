import { getLocale, getT } from '@/core/i18n/server';
import { homeV11Messages, homeMessages } from './messages';
import { HomeTilesView } from './home-tiles-view';

export async function HomeTiles(props: { adherence: number; previous: number; trained: number; active: number; pending: number; paid: number; progress: number; incomeGoal?: number | null }) {
  const [t, locale, old] = await Promise.all([getT(homeV11Messages), getLocale(), getT(homeMessages)]);
  return <HomeTilesView {...props} t={t} locale={locale} old={old} />;
}

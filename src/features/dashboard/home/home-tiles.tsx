import { getArabicStyle, getLocale, getT } from '@/core/i18n/server';
import { homeV11Messages, homeMessages } from './messages';
import { HomeTilesView } from './home-tiles-view';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function HomeTiles(props: { adherence: number; previous: number; hasPrevious?: boolean; trained: number; active: number; pending: number; paid: number; progress: number; incomeGoal?: number | null }) {
  const phone = captainWorkspaceEnabled();
  const [t, locale, old, style] = await Promise.all([getT(homeV11Messages), getLocale(), getT(homeMessages), phone ? getArabicStyle() : undefined]);
  return <HomeTilesView {...props} t={t} locale={locale} old={old} phone={phone} style={style} />;
}

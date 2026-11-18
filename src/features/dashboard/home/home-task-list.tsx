import { unstable_rethrow } from 'next/navigation';
import { getArabicStyle, getLocale, getT } from '@/core/i18n/server';
import { fetchMoneyOwed } from '@/features/billing/server';
import { homeV11Messages, homeMessages } from './messages';
import type { HomeTask } from './tasks';
import { HomeTaskListView } from './home-task-list-view';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function HomeTaskList(props: { tasks: HomeTask[]; count: number; contacts: Map<string, string>; today?: string }) {
  const phone = captainWorkspaceEnabled();
  const [t, locale, old, style, owed] = await Promise.all([getT(homeV11Messages), getLocale(), getT(homeMessages),
    phone ? getArabicStyle() : undefined,
    phone ? fetchMoneyOwed().catch((error: unknown) => { unstable_rethrow(error); return null; }) : undefined,
  ]);
  const debts = owed?.rows.flatMap(row => row.reason === 'partial' && row.amount !== null && row.amount > 0
    ? [{ playerId: row.playerId, name: row.name, amount: row.amount }] : []);
  return <HomeTaskListView {...props} {...{ t, locale, old, phone, style, debts }} />;
}

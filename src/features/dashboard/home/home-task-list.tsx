import { getLocale, getT } from '@/core/i18n/server';
import { homeV11Messages, homeMessages } from './messages';
import type { HomeTask } from './tasks';
import { HomeTaskListView } from './home-task-list-view';

export async function HomeTaskList(props: { tasks: HomeTask[]; count: number; contacts: Map<string, string> }) {
  const [t, locale, old] = await Promise.all([getT(homeV11Messages), getLocale(), getT(homeMessages)]);
  return <HomeTaskListView {...props} t={t} locale={locale} old={old} />;
}

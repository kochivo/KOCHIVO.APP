'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { messages as v6Messages } from '../v6-messages';
import { messages as alternativeMessages } from '../alternatives/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { SetRowsView } from './set-rows-view';
import type { SetRowsState } from './set-rows-view';

export function SetRows({ state, secondary = false }: { state: SetRowsState; secondary?: boolean }) {
  const t = useT(messages), v6t = useT(v6Messages), at = useT(alternativeMessages);
  const locale = useLocale();
  return <SetRowsView state={state} secondary={secondary} t={t} v6t={v6t} at={at} locale={locale} v6={captainWorkspaceEnabled()} />;
}

'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { messages } from '../messages';
import { messages as workspaceMessages } from '../workspace/messages';
import type { SettingsProfile } from '../schema';
import { WorkspaceFact } from './workspace-fact';

export function WorkspaceLanguageCard({ profile }: { profile: SettingsProfile }) {
  const t = useT(messages), workspace = useT(workspaceMessages), locale = useLocale();
  const zone = profile.timezone;
  return <section className="glass rounded-card border border-line-soft p-3.5">
    <h2 className="mb-2 text-sm font-semibold">{t('workspaceLanguageTime')}</h2>
    <WorkspaceFact label={workspace('language')}><b>{workspace(locale === 'en' ? 'english' : 'arabic')}</b></WorkspaceFact>
    <WorkspaceFact label={t('timezone')}><b>{zone === DEFAULT_TIMEZONE ? workspace('cairo') : zone || workspace('unset')}
      {profile.timezone_auto === true && <> {t('workspaceAutomatic')}</>}</b></WorkspaceFact>
  </section>;
}

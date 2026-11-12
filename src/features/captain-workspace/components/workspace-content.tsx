import { notFound } from 'next/navigation';
import { TimezoneScope } from '@/core/timezone/timezone-scope';
import { getLocale } from '@/core/i18n/server';
import { readPlayerFile } from '../player-file/read-player-file';
import { readPlayerProfile } from '../player-file/profile-data';
import { loadProgram, listPlayerPrograms } from '@/features/programs';
import { WorkspaceViews } from '../forms/workspace-views';
import { PlayerFileSlot } from './player-file-slot';
import { WorkspacePlanEntry } from './workspace-plan-entry';
import { WorkspaceState } from './workspace-state';
import { MobileActions } from './mobile-actions';
import type { Profile } from '../player-file/types';
import type { PlayerFile } from '@/features/player-file';

export async function WorkspaceContent({ playerId, embedded, profileData, fileData }: {
  playerId: string; today: string; embedded?: boolean; profileData?: Profile; fileData?: PlayerFile;
}) {
  const [locale, profile, programs, playerFile] = await Promise.all([
    getLocale(), profileData ? Promise.resolve({ data: profileData, error: undefined }) : readPlayerProfile(playerId), listPlayerPrograms(playerId),
    (fileData ? Promise.resolve(fileData) : readPlayerFile(playerId)).then(
      file => ({ file, error: false }), () => ({ file: null, error: true })),
  ]);
  const retryHref = `/captain/players/${playerId}/programs`;
  if (profile.error || programs.error !== undefined) return <WorkspaceState kind="error" locale={locale} retryHref={retryHref} />;
  if (!profile.data) notFound();
  const current = programs.data?.find(program => program.status === 'active') ?? programs.data?.find(program => program.status === 'draft');
  const loaded = current ? await loadProgram(current.id) : null;
  const content = <>
    <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <PlayerFileSlot player={profile.data} locale={locale} file={playerFile.file} error={playerFile.error} />
      {loaded?.data ? <WorkspacePlanEntry key={loaded.data.id} program={loaded.data} locale={locale}
        fallback={<WorkspaceState kind="loading" locale={locale} />} /> :
        <WorkspaceState kind={loaded?.error !== undefined ? 'error' : 'empty'} locale={locale} retryHref={retryHref} />}
    </div>
    <MobileActions locale={locale} />
  </>;
  return <TimezoneScope timezone={profile.data.timezone}><div className="space-y-5 pb-40 lg:pb-0" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    {embedded ? content : <WorkspaceViews playerId={playerId} name={profile.data.name} locale={locale}>{content}</WorkspaceViews>}
  </div></TimezoneScope>;
}

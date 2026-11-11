import { notFound } from 'next/navigation';
import { getLocale } from '@/core/i18n/server';
import { supabaseServer } from '@/core/supabase/server';
import { loadPlayerFile } from '@/features/player-file';
import { fetchPlayerProfile } from '@/features/player-profile';
import { loadProgram, listPlayerPrograms } from '@/features/programs';
import { WorkspaceViews } from '../forms/workspace-views';
import { PlayerFileSlot } from './player-file-slot';
import { WorkspacePlanEntry } from './workspace-plan-entry';
import { WorkspaceState } from './workspace-state';
import { MobileActions } from './mobile-actions';

export async function WorkspaceContent({ playerId }: { playerId: string; today: string }) {
  const [locale, profile, programs, playerFile] = await Promise.all([
    getLocale(), fetchPlayerProfile(playerId), listPlayerPrograms(playerId),
    supabaseServer().then(client => loadPlayerFile(client, playerId)).then(
      file => ({ file, error: false }), () => ({ file: null, error: true })),
  ]);
  const retryHref = `/captain/players/${playerId}/programs`;
  if (profile.error || programs.error !== undefined) return <WorkspaceState kind="error" locale={locale} retryHref={retryHref} />;
  if (!profile.data) notFound();
  const current = programs.data?.find(program => program.status === 'active') ?? programs.data?.find(program => program.status === 'draft');
  const loaded = current ? await loadProgram(current.id) : null;
  return <div className="space-y-5 pb-40 lg:pb-0" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <WorkspaceViews playerId={playerId} name={profile.data.name} locale={locale}>
    <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <PlayerFileSlot player={profile.data} locale={locale} file={playerFile.file} error={playerFile.error} />
      {loaded?.data ? <WorkspacePlanEntry key={loaded.data.id} program={loaded.data} locale={locale}
        fallback={<WorkspaceState kind="loading" locale={locale} />} /> :
        <WorkspaceState kind={loaded?.error !== undefined ? 'error' : 'empty'} locale={locale} retryHref={retryHref} />}
    </div>
    <MobileActions locale={locale} />
    </WorkspaceViews>
  </div>;
}

import 'server-only';
import { getPlayerTimezone } from '@/core/timezone/server';
import { localDate } from '@/lib/dates';
import { PlayerFileEntry } from '../player-file/file-entry';
import { WorkspaceContent } from './workspace-content';

export async function WorkspaceEntry({ playerId }: { playerId: string }) {
  return <PlayerFileEntry playerId={playerId} tab="training">
    <WorkspaceContent playerId={playerId} today={localDate(new Date(), await getPlayerTimezone(playerId))} embedded />
  </PlayerFileEntry>;
}

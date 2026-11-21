import { internationalEnabled } from '@/lib/international-enabled';
import { profileTimezone } from '@/lib/timezone';
import { localDate } from '@/lib/dates';
import { givenName } from '@/lib/display-name';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';
import { cache } from 'react';
import { currentClaims } from '@/core/supabase/claims';
import { unstable_rethrow } from 'next/navigation';
import { rosterClient } from './client';
import type { RosterResult } from '../types';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { loadRosterChat } from './roster-chat';

export const fetchRoster = cache(async (): Promise<RosterResult> => {
  try {
    const client = await rosterClient();
    const { data, error } = await client.rpc('captain_roster');
    if (error || !data) return { error: (await getT(messages))('couldntLoadPlayersTryAgain') };
    const zones = new Map<string, string>();
    const avatars = new Map<string, string | null>();
    const links = new Map<string, { id: string; pending: boolean; frozen_at: string | null; awaiting_plans_at: string | null; sessions_left: number | null }>();
    const tiers = captainWorkspaceEnabled() ? await client.rpc('captain_player_tiers') : null;
    if (tiers?.error) throw tiers.error;
    const tierMap = new Map(tiers?.data?.map(t => [t.player_id, t]));
    let chat: Awaited<ReturnType<typeof loadRosterChat>> = {};
    if (data.length) {
      if (captainWorkspaceEnabled()) {
        const claims = await currentClaims();
        if (claims.error || !claims.data?.claims.sub) throw new Error('Unauthenticated');
        // Chat is secondary: a chat failure must never take the whole roster down.
        chat = await loadRosterChat(client, claims.data.claims.sub, data.map(row => row.player_id))
          .catch((error: unknown) => { console.warn('Roster chat unavailable', error); return {}; });
      }
      const profiles = await client.from('profiles').select('id,avatar_path,timezone').in('id', data.map(row => row.player_id));
      if (profiles.error) throw profiles.error;
      for (const profile of profiles.data ?? []) avatars.set(profile.id, profile.avatar_path ?
        client.storage.from('captain-avatars').getPublicUrl(profile.avatar_path).data.publicUrl : null);
      for (const profile of profiles.data ?? []) zones.set(profile.id, profileTimezone(profile.timezone));
      const balances = await client.from('coach_clients').select('id,player_id,pending,frozen_at,awaiting_plans_at,sessions_left').is('archived_at', null);
      if (balances.error) throw balances.error;
      for (const link of balances.data ?? []) links.set(link.player_id, link);
    }
    return { players: data.map((row) => ({
      playerId: row.player_id, fullName: row.full_name, accessUntil: row.access_until,
      ...(captainWorkspaceEnabled() ? { chat: chat[row.player_id] } : {}),
      ...(captainWorkspaceEnabled() ? { tier: tierMap.get(row.player_id) ?? null } : {}),
      linkId: links.get(row.player_id)?.id, pending: links.get(row.player_id)?.pending,
      frozenAt: links.get(row.player_id)?.frozen_at, sessionsLeft: links.get(row.player_id)?.sessions_left,
      awaitingPlansAt: links.get(row.player_id)?.awaiting_plans_at,
      avatarUrl: avatars.get(row.player_id) ?? null,
      ...(internationalEnabled() ? { timezone: zones.get(row.player_id), playerToday: localDate(new Date(), zones.get(row.player_id)) } : {}),
      startedOn: row.started_on, lastTrainingDate: row.last_training_date,
      programTitle: row.program_title, openTasks: row.open_tasks,
    })) };
  } catch (error) {
    unstable_rethrow(error);
    return { error: (await getT(messages))('couldntLoadPlayersTryAgain') };
  }
});

export const fetchCaptainFirstName = cache(async (): Promise<string> => {
  try {
    const client = await rosterClient();
    const { data, error } = await currentClaims();
    if (error || !data?.claims.sub) return '';
    const profile = await client.from('profiles').select('full_name').eq('id', data.claims.sub).single();
    return givenName(profile.data?.full_name ?? '');
  } catch (error) { unstable_rethrow(error); return ''; }
});

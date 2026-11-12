import 'server-only';
import { cache } from 'react';
import { supabaseServer } from '@/core/supabase/server';
import { loadPlayerFile } from '@/features/player-file';

export const readPlayerFile = cache(async (playerId: string) => loadPlayerFile(await supabaseServer(), playerId));

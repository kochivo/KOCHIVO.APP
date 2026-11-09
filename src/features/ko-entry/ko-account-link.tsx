import 'server-only';
import { headers } from 'next/headers';
import { koPilotAvailable } from './config';
import { KoAccountWidget } from './ko-account-widget';

export async function KoAccountLink({ player = false }: { player?: boolean }) {
  if (!await koPilotAvailable()) return null;
  if (player) {
    const path = (await headers()).get('x-kochivo-path') ?? '';
    if (/^\/player\/(?:workout|onboarding)(?:\/|$)/.test(path)) return null;
  }
  return <KoAccountWidget role={player ? 'player' : 'captain'} />;
}

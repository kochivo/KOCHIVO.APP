import { ImageResponse } from 'next/og';
import { z } from 'zod';
import { Children, cloneElement, Fragment, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { RankBadgeShapes } from '@/ui/rank-badge-shapes';
import { MedalArt } from '@/ui/medal-art';
import { medalRank, MEDAL_RANKS, ranksMessages } from '@/features/ranks/server';
import { medalColors } from './medal-colors';
import { supabaseServer } from '@/core/supabase/server';
import { getLocale } from '@/core/i18n/server';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
// Value imports from @/features/ranks would pull its client screens into every route's OG image entry.
import type { MedalRank } from '@/features/ranks';
import { messages } from './messages';
import { ogColors as colors } from './og-colors';
import { ogFont } from './data/og-font';
import { shareText } from './share-text';

const headers = { 'Cache-Control': 'private, no-store' };
const pointsSchema = z.object({ lifetime: z.number().int().nonnegative() });
const boardSchema = z.array(z.object({ player_id: z.string().nullable(), is_crown: z.boolean() }));

export async function rankImageResponse(request: Request): Promise<Response> {
  try {
    const db = await supabaseServer();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return new Response(null, { status: 401, headers });
    const profile = await db.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.role !== 'player') return new Response(null, { status: 401, headers });
    const params = new URL(request.url).searchParams;
    const kind = params.get('kind') ?? 'rank';
    if ([...params.keys()].some(key => key !== 'kind') || params.getAll('kind').length > 1 ||
      (kind !== 'rank' && kind !== 'crown')) return new Response(null, { status: 400, headers });
    const points = await db.rpc('my_points');
    if (points.error) throw points.error;
    const { lifetime } = pointsSchema.parse(points.data);
    if (kind === 'crown') {
      const board = await db.rpc('team_leaderboard');
      if (board.error) throw board.error;
      if (!boardSchema.parse(board.data).some(row => row.player_id === user.id && row.is_crown)) {
        return new Response(null, { status: 404, headers });
      }
    }
    const link = await db.from('coach_clients').select('captain_id').eq('player_id', user.id)
      .is('archived_at', null).eq('pending', false).maybeSingle();
    if (link.error) throw link.error;
    let captain = '';
    if (link.data) {
      const coach = await db.from('profiles').select('full_name').eq('id', link.data.captain_id).maybeSingle();
      if (coach.error) throw coach.error;
      captain = coach.data?.full_name ?? '';
    }
    return await rankImage(await getLocale(), profile.data.full_name, captain, kind === 'crown' ? 'crown' : medalRank(lifetime));
  } catch {
    return new Response(null, { status: 500, headers });
  }
}

function ogShapes(nodes: ReactNode): ReactNode {
  // Reuse the complete badge geometry, resolving its browser paints to the OG palette.
  const paint = (value?: string) => value?.startsWith('var(') ? colors.muted
    : value?.startsWith('url(') ? (value.includes('-f') ? colors.bg : colors.lime) : value;
  return Children.map(nodes, node => {
    if (!isValidElement<{ children?: ReactNode; fill?: string; stroke?: string }>(node)) return node;
    if (node.type === Fragment) return cloneElement(node, {}, ogShapes(node.props.children));
    return cloneElement(node, { fill: paint(node.props.fill), stroke: paint(node.props.stroke) },
      ogShapes(node.props.children));
  });
}

async function rankImage(locale: Locale, fullName: string, captain: string, tier: MedalRank | 'crown') {
  const t = createT(messages, locale);
  const name = fullName.trim().split(/\s+/)[0] || t('player');
  const title = tier === 'crown' ? t('crown', { name }) : t('rank', { name, tier: createT(ranksMessages, locale)(tier) });
  const rank = MEDAL_RANKS.findIndex(entry => entry.rank === tier) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const font = await ogFont();
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 64, width: '100%', height: '100%', padding: 80,
    background: `radial-gradient(ellipse at top, ${colors.glow}, ${colors.bg} 75%)`,
    color: colors.ink, fontFamily: 'Card', textAlign: 'center' }}>
    {tier === 'crown' ? <svg viewBox="0 0 120 130" width={480} height={520}>
      {ogShapes(RankBadgeShapes({ tier, id: 'rank' }))}
    </svg> : MedalArt({ rank, id: 'rank', label: title, size: 480, paints: { ...medalColors[rank], bg: colors.bg, ink: colors.ink } })}
    <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.5, wordBreak: 'break-word' }}>{shareText(title)}</div>
    {captain && <div style={{ display: 'flex', fontSize: 42, color: colors.muted, wordBreak: 'break-word' }}>
      {shareText(t('captain', { name: captain }))}</div>}
    <div style={{ display: 'flex', fontSize: 52, letterSpacing: 10, color: colors.lime }}>{t('brand')}</div>
  </div>, { width: 1080, height: 1920, headers,
    fonts: [{ name: 'Card', data: font, weight: 700, style: 'normal' }] });
}

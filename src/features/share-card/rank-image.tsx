import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
import { RankImageBurst } from './rank-image-burst';
import { RankTitle3d } from './rank-title-3d';

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
    let workouts: number | undefined;
    try {
      const medals = await db.rpc('my_medals');
      const parsed = z.array(z.object({ workouts: z.number().int().nonnegative() })).safeParse(medals.data);
      if (!medals.error && parsed.success) workouts = parsed.data[0]?.workouts;
    } catch { /* Optional stats must never prevent sharing an earned rank. */ }
    return await rankImage(await getLocale(), profile.data.full_name, captain,
      kind === 'crown' ? 'crown' : medalRank(lifetime), lifetime, workouts);
  } catch {
    return new Response(null, { status: 500, headers });
  }
}

function Words({ text }: { text: string }) {
  // Satori draws Changa's space far too wide; a fixed gap keeps Arabic phrases tight.
  return <div style={{ display: 'flex', gap: '0.28em' }}>{shareText(text).split(' ').map((word, i) => <div key={i}>{word}</div>)}</div>;
}

function ogShapes(nodes: ReactNode): ReactNode {
  // Reuse the complete badge geometry, resolving its browser paints to the OG palette.
  const paint = (value?: string) => value?.startsWith('var(') ? colors.muted
    : value?.startsWith('url(') ? (value.includes('-f') ? colors.bg : medalColors[3].s1) : value;
  return Children.map(nodes, node => {
    if (!isValidElement<{ children?: ReactNode; fill?: string; stroke?: string }>(node)) return node;
    if (node.type === Fragment) return cloneElement(node, {}, ogShapes(node.props.children));
    return cloneElement(node, { fill: paint(node.props.fill), stroke: paint(node.props.stroke) },
      ogShapes(node.props.children));
  });
}

async function rankImage(locale: Locale, fullName: string, captain: string, tier: MedalRank | 'crown', lifetime: number, workouts?: number) {
  const t = createT(messages, locale);
  const name = fullName.trim().split(/\s+/)[0] || t('player');
  const title = tier === 'crown' ? t('crownAction') : createT(ranksMessages, locale)(tier);
  const rank = (tier === 'crown' ? 3 : MEDAL_RANKS.findIndex(entry => entry.rank === tier)) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const metal = medalColors[rank];
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  const font = await ogFont();
  const logo = await readFile(join(process.cwd(), 'public/brand/logo-primary.png'));
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', height: '100%',
    background: `radial-gradient(ellipse at 50% 36%, ${metal.s1}99, transparent 45%), radial-gradient(ellipse at 50% 36%, ${metal.s1}26, transparent 70%), ${colors.storyBg}`,
    color: colors.ink, fontFamily: 'Card', textAlign: 'center' }}>
    {RankImageBurst({ metal })}
    <div style={{ position: 'absolute', top: 90, display: 'flex', width: 900, justifyContent: 'space-between', alignItems: 'center' }}>
      {/* Satori needs embedded image bytes to render without network access. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${logo.toString('base64')}`} width={245} height={70} alt={t('brand')} />
      <div dir={dir} style={{ display: 'flex', fontSize: 36, padding: '14px 34px', borderRadius: 100,
        background: colors.lime, color: colors.pillInk, transform: 'rotate(-4deg)', boxShadow: `0 10px 30px ${colors.glow}` }}><Words text={t(tier === 'crown' ? 'monthlyCrown' : 'newRank')} /></div>
    </div>
    <div style={{ position: 'absolute', top: 300, display: 'flex', width: 780, height: 780,
      alignItems: 'center', justifyContent: 'center', filter: `drop-shadow(0 0 60px ${metal.s1}99)` }}>
    {tier === 'crown' ? <svg viewBox="0 0 120 130" width={780} height={780} style={{ flexShrink: 0 }}>
      {ogShapes(RankBadgeShapes({ tier, id: 'rank' }))}
    </svg> : MedalArt({ rank, id: 'rank', label: title, size: 780, paints: { ...metal, bg: colors.bg, ink: colors.ink } })}
    </div>
    <div style={{ position: 'absolute', top: 1015, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 1000 }}>
      <div dir={dir} style={{ display: 'flex', fontSize: 44, lineHeight: 1.2, color: metal.s0 }}><Words text={t(tier === 'crown' ? 'monthlyCrown' : 'reached')} /></div>
      {RankTitle3d({ title: shareText(title), metal, dir })}
      <div dir={/[\u0600-\u06ff]/.test(name) ? 'rtl' : 'ltr'} style={{ display: 'flex', fontSize: 92,
        maxWidth: 920, lineHeight: 1.1, wordBreak: 'break-word', textShadow: `0 6px 30px ${metal.ground}` }}>{name}</div>
      <div style={{ display: 'flex', gap: 26, marginTop: 22 }}>
        {[{ n: lifetime, label: t('pointsLabel') }, ...(workouts === undefined ? [] : [{ n: workouts, label: t('workoutsLabel') }])].map(stat =>
          <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 250,
            padding: '16px 34px', borderRadius: 28, transform: 'skewX(-8deg)', border: `2px solid ${metal.s1}99`,
            background: `linear-gradient(${metal.s1}40, ${metal.ground}99)` }}>
            <div style={{ display: 'flex', fontSize: 80, lineHeight: 1 }}>{stat.n}</div>
            <div dir={dir} style={{ display: 'flex', fontSize: 30, color: metal.s0, marginTop: 8 }}><Words text={stat.label} /></div>
          </div>)}
      </div>
    </div>
    <div style={{ position: 'absolute', bottom: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    {/* Satori lays rows out left to right even under dir="rtl", so Arabic reverses the row by hand. */}
    {captain.trim() && <div dir={dir} style={{ display: 'flex', alignItems: 'center', gap: 12, color: colors.muted, fontSize: 32,
      flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}>
      <Words text={t('withCaptain')} />
      <Words text={captain.trim()} />
    </div>}
      <div style={{ display: 'flex', fontSize: 32, letterSpacing: 6, color: colors.lime }}>{t('site')}</div>
    </div>
  </div>, { width: 1080, height: 1920, headers,
    fonts: [{ name: 'Card', data: font, weight: 700, style: 'normal' }] });
}

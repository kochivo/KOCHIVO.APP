'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/ui/button';
import { EmptyState, GlassCard } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { fetchRadar } from '../data/radar';
import { radarReasonLabel, radarWhatsappUrl } from '../radar';
import type { RadarResult } from '../radar';

export function RadarCard({ today, showEmpty = false }: { today: string; showEmpty?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const [loaded, setLoaded] = useState<{ today: string; result: RadarResult } | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    fetchRadar(today).then(
      (result) => { if (active) setLoaded({ today, result }); },
      () => { if (active) setLoaded({ today, result: { error: t('radarIsUnavailable') } }); },
    );
    return () => { active = false; };
  }, [today, t]);

  if (!loaded || loaded.today !== today) return <LoadingState variant="list" />;
  const { result } = loaded;
  if (result.error) return <p role="alert" className="text-sm text-muted">{t('radarIsUnavailable')}</p>;
  const players = result.data ?? [];
  if (players.length === 0) return showEmpty ? <EmptyState className="glass-strong" icon={CheckCheck} title={t('dropoutRadar')} body={t('radarAllClear')} action={{ label: t('players'), href: '/captain/players' }} /> : null;

  return (
    <GlassCard level="strong" className="space-y-3 border-warn/40 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden className="size-2 rounded-full bg-warn motion-safe:animate-pulse" />
        {t('dropoutRadar')} <span className="text-warn">{formatNumber(players.length, locale)}</span>
      </h2>
      <ul className="divide-y divide-line">
        {(expanded ? players : players.slice(0, 5)).map((player) => {
          const href = radarWhatsappUrl(player, locale);
          return (
            <li key={player.player_id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-words font-bold">{player.full_name}</p>
                <p className="text-sm text-muted">
                  {radarReasonLabel(player.reason, player.days, locale)}
                  {player.reason === 'no_program' && (' · ' + t('dayCount', { n: player.days, count: formatNumber(player.days, locale) }))}
                </p>
              </div>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t('message', { v0: player.full_name })}
                  className={captainWorkspaceEnabled() ? 'glass inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-line px-4 text-sm text-ink hover:bg-surface-raised' : 'inline-flex min-h-12 shrink-0 items-center justify-center rounded-control px-4 text-sm text-ink hover:bg-surface-raised'}>{t('message2')}</a>
              ) : <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} disabled className="min-h-12 shrink-0" aria-label={t('messageNoPhoneNumber', { v0: player.full_name })}>{t('message2')}</Button>}
            </li>
          );
        })}
      </ul>
      {!expanded && players.length > 5 && (
        <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" aria-expanded={expanded} onClick={() => setExpanded(true)}>{t('showAll')}</Button>
      )}
    </GlassCard>
  );
}

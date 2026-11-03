'use client';

import { useEffect, useState } from 'react';
import { Button, GlassCard } from '@/ui';
import { fetchRadar } from '../data/radar';
import { radarReasonLabel, radarWhatsappUrl } from '../radar';
import type { RadarResult } from '../radar';

export function RadarCard({ today }: { today: string }) {
  const [loaded, setLoaded] = useState<{ today: string; result: RadarResult } | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    fetchRadar(today).then(
      (result) => { if (active) setLoaded({ today, result }); },
      () => { if (active) setLoaded({ today, result: { error: 'الرادار مش متاح دلوقتي' } }); },
    );
    return () => { active = false; };
  }, [today]);

  if (!loaded || loaded.today !== today) return <p role="status" className="text-sm text-muted">بنحمّل الرادار…</p>;
  const { result } = loaded;
  if (result.error) return <p role="alert" className="text-sm text-muted">الرادار مش متاح دلوقتي</p>;
  const players = result.data ?? [];
  if (players.length === 0) return null;

  return (
    <GlassCard level="strong" className="space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden className="size-2 rounded-full bg-warn" />
        رادار الانسحاب <span className="text-warn">{players.length}</span>
      </h2>
      <ul className="divide-y divide-line">
        {(expanded ? players : players.slice(0, 5)).map((player) => {
          const href = radarWhatsappUrl(player);
          return (
            <li key={player.player_id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-words font-bold">{player.full_name}</p>
                <p className="text-sm text-muted">
                  {radarReasonLabel(player.reason, player.days)}
                  {player.reason === 'no_program' && ` · ${player.days} ${player.days <= 10 ? 'أيام' : 'يوم'}`}
                </p>
              </div>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`ابعتله: ${player.full_name}`}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-control px-4 text-sm text-ink hover:bg-surface-raised">ابعتله</a>
              ) : <Button variant="ghost" disabled className="min-h-12 shrink-0" aria-label={`ابعتله: ${player.full_name}، مفيش رقم موبايل`}>ابعتله</Button>}
            </li>
          );
        })}
      </ul>
      {!expanded && players.length > 5 && (
        <Button variant="ghost" className="min-h-12" aria-expanded={expanded} onClick={() => setExpanded(true)}>وريني الكل</Button>
      )}
    </GlassCard>
  );
}

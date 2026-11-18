'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import { Disclosure } from '@/ui/disclosure';
import { messages } from './messages';
import type { Profile } from './types';

const ReplyBox = dynamic(() => import('@/features/inbox').then(module => module.ReplyBox), {
  loading: () => <LoadingState variant="detail" />,
});

export function CheckinReview({ row, playerId, playerName }: {
  row: Profile['checkIns'][number]; playerId: string; playerName: string;
}) {
  const t = useT(messages);
  const router = useRouter();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function send(reply: string) {
    if (busy.current || saved) return;
    busy.current = true;
    setSending(true);
    setError('');
    try {
      const { reviewItem } = await import('@/features/inbox');
      const result = await reviewItem({ kind: 'checkin', id: row.id, reply });
      if (result.error) setError(result.error);
      else { setSaved(true); router.refresh(); }
    } catch { setError(t('reviewFailed')); }
    finally { busy.current = false; setSending(false); }
  }

  return <Disclosure label={t('reviewCheckin')} className="glass mt-stack text-sm" onToggle={event => setOpen(event.currentTarget.open)}>
    {saved ? <p role="status">{t('reviewed')}</p> : open && <ReplyBox
      item={{ kind: 'checkin', id: row.id, player_id: playerId, player_name: playerName,
        created_at: row.weekStart, week_start: row.weekStart, body_weight_kg: row.weightKg,
        waist_cm: row.waistCm, notes: row.notes, reviewed_at: row.reviewedAt, reply: row.reply }}
      disabled={sending} onSend={reply => void send(reply)} />}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </Disclosure>;
}

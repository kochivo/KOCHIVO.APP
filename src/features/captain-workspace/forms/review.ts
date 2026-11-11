import type { PlayerForm } from './adapter';

export type ReviewAction = (input: { kind: 'checkin'; id: string; reply: string }) => Promise<{ data?: true; error?: string }>;
export type FormsMutation = (next: (current: PlayerForm[] | undefined) => PlayerForm[], commit: () => Promise<unknown>) => Promise<boolean>;

export async function sendFormReview({ form, reply, now, mutate, review, toast, failure, success }: {
  form: PlayerForm; reply: string; now: Date; mutate: FormsMutation; review: ReviewAction;
  toast: { error: (text: string) => void; success: (text: string) => void }; failure: string; success: string;
}) {
  if (form.snapshot.source.kind !== 'checkin') return false;
  const reviewedAt = now.toISOString();
  const optimisticReply = reply.trim() || null;
  const ok = await mutate(current => (current ?? []).map(item => item.snapshot.source.kind === 'checkin'
    && item.snapshot.source.id === form.snapshot.source.id
    ? { ...item, reply: optimisticReply, reviewedAt } : item), async () => {
    const result = await review({ kind: 'checkin', id: form.snapshot.source.id, reply });
    if (!result.data || result.error) throw new Error(result.error ?? failure);
  });
  if (!ok) {
    // Navigation cancels the resource version; reconcile only this attempt's optimistic fields.
    await mutate(current => (current ?? []).map(item => item.snapshot.source.kind === 'checkin'
      && item.snapshot.source.id === form.snapshot.source.id && item.reviewedAt === reviewedAt && item.reply === optimisticReply
      ? { ...item, reply: form.reply, reviewedAt: form.reviewedAt } : item), async () => {});
  }
  if (ok) toast.success(success);
  else toast.error(failure);
  return ok;
}

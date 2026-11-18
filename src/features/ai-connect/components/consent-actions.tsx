'use client';
import { useActionState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { decideConsent } from '../data/actions';
import { messages } from '../messages';

export function ConsentActions({ id, eligible }: { id: string; eligible: boolean }) {
  const t = useT(messages);
  const [failed, submit, pending] = useActionState(async (_: boolean, data: FormData) => {
    await decideConsent(id, data.get('decision') === 'approve' ? 'approve' : 'deny');
    return true;
  }, false);
  return <form action={submit} aria-busy={pending} className="mt-auto space-y-stack pt-section">
    {failed && <p role="alert" className="text-sm text-danger">{t('decisionError')}</p>}
    {eligible && <Button type="submit" name="decision" value="approve" size="lg" block disabled={pending}>
      {t(pending ? 'pending' : 'allow')}
    </Button>}
    <Button type="submit" name="decision" value="deny" variant="secondary" size="lg" block disabled={pending}>
      {t(pending ? 'pending' : 'deny')}
    </Button>
  </form>;
}

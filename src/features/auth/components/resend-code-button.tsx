'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';
import { resendRemaining } from '../resend-cooldown';

const systemNow = () => Date.now();

export function ResendCodeButton({ sentAt, pending, onResend, now = systemNow }: {
  sentAt: number; pending: boolean; onResend: () => void; now?: () => number;
}) {
  const t = useT(messages);
  const [, refresh] = useState(0);
  const remaining = resendRemaining(sentAt, now);
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => refresh(value => value + 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, sentAt]);
  return <Button type="button" variant="secondary" className="min-h-12 w-full" disabled={pending || remaining > 0}
    onClick={() => { if (!resendRemaining(sentAt, now)) onResend(); }}>
    {remaining ? t('resendAfter', { n: remaining }) : t('resendCode')}
  </Button>;
}

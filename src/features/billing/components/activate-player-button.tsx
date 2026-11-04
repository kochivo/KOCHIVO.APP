'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../packages/messages';
import { BillingManagerLoader } from './billing-manager-loader';

export function ActivatePlayerButton(props: { playerId: string; name: string; today: string }) {
  const t = useT(messages);
  const [opening, setOpening] = useState(0);
  return <><Button variant="secondary" className="min-h-12" onClick={() => setOpening(value => value + 1)}>{t('activate')}</Button>
    {opening > 0 && <BillingManagerLoader key={opening} {...props} autoActivate />}</>;
}

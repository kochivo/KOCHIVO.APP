'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import type { ActionResult } from '@/lib/action-result';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { foodFormMessages, messages } from '../messages';
import type { Food } from '../types';

const FoodForm = dynamic(() => import('./food-form').then(module => module.FoodForm),
  { loading: () => <LoadingState variant="detail" /> });

export function FoodFormEntry({ result, returnTo, copyFrom }: {
  result?: ActionResult<Food>; returnTo?: string; copyFrom?: string;
}) {
  const t = useT(messages);
  const formT = useT(foodFormMessages);
  const locale = useLocale();
  const router = useRouter();
  if (result && !result.ok) return <section className="glass grid gap-4 rounded-card p-5">
    <p role="alert" className="text-danger">{result.error}</p>
    <div className="flex gap-3">
      <Button onClick={() => router.refresh()}>{t('tryAgain')}</Button>
      <Button variant="secondary" onClick={() => router.replace(`/${locale}/captain/library/foods`)}>{formT('cancel')}</Button>
    </div>
  </section>;
  return <FoodForm key={result?.data.id ?? 'new'} food={result?.data} copyFrom={copyFrom} returnTo={returnTo} />;
}

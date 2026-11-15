'use client';
import { Pencil } from 'lucide-react';
import { KoCamera } from '@/ui/icons';
import { useT } from '@/core/i18n/client';
import { messages } from '../v6-messages';
import { Button } from '@/ui/button';

export function FoodActions() {
  const t = useT(messages);
  return <div className="grid grid-cols-2 gap-2">
    {(['photo', 'writeFood'] as const).map(key => <Button key={key} type="button" disabled
      variant={'secondary'} block={false} className={"flex min-h-14 flex-wrap items-center justify-center gap-2 bg-transparent px-2 py-2 font-sans text-sm font-bold text-ink"}>
      {key === 'photo' ? <KoCamera aria-hidden className="size-5" /> : <Pencil aria-hidden className="size-5" />}
      {t(key)}<span className="text-[10px] font-normal text-muted">{t('soon')}</span>
    </Button>)}
  </div>;
}

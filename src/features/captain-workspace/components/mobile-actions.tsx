import { KoPlus } from '@/ui/icons/ko-plus';
import { KoSend } from '@/ui/icons/ko-send';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Plus, Send } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import { Button } from '@/ui/button';

export function MobileActions({ locale }: { locale: Locale }) {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = createT(messages, locale);
  return <div className="fixed start-0 end-0 bottom-[calc(var(--nav-clearance)+4.5rem)] z-30 flex gap-3 border-t border-line bg-surface p-4 lg:hidden">
    <Button type="button" aria-label={t('add')} variant={'secondary'} block={false} className={"grid size-14 shrink-0 place-items-center"}>
      <PlusIcon aria-hidden strokeWidth={1.5} className="size-6" />
    </Button>
    <Button type="button" variant={'primary'} block={false} className={"flex min-h-14 flex-1 items-center justify-center gap-2 px-4 font-bold"}>
      <SendIcon aria-hidden strokeWidth={1.5} className="size-5" />{t('send')}
    </Button>
  </div>;
}

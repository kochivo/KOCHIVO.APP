import { KoPlus } from '@/ui/icons/ko-plus';
import { KoSend } from '@/ui/icons/ko-send';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Plus, Send } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';

export function MobileActions({ locale }: { locale: Locale }) {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = createT(messages, locale);
  return <div className="fixed start-0 end-0 bottom-[calc(var(--nav-clearance)+4.5rem)] z-30 flex gap-3 border-t border-line bg-surface p-4 lg:hidden">
    <button type="button" aria-label={t('add')} className="glass-strong grid size-14 shrink-0 place-items-center rounded-control border border-line">
      <PlusIcon aria-hidden strokeWidth={1.5} className="size-6" />
    </button>
    <button type="button" className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-control bg-lime px-4 font-bold text-on-lime">
      <SendIcon aria-hidden strokeWidth={1.5} className="size-5" />{t('send')}
    </button>
  </div>;
}

import { ChevronRight } from 'lucide-react';
import { IconButton } from '@/ui/icon-button';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function PainScreenHeader({ title, subtitle, onClose, busy }: {
  title: string; subtitle: string; onClose: () => void; busy?: boolean;
}) {
  const t = useT(messages);
  return <header className="flex items-center gap-stack">
    <IconButton aria-label={t('back')} disabled={busy} onClick={onClose}><ChevronRight aria-hidden className="dir-icon size-5" /></IconButton>
    <div className="min-w-0 flex-1"><h2 className="text-md font-bold">{title}</h2><p className="text-micro text-muted">{subtitle}</p></div>
  </header>;
}

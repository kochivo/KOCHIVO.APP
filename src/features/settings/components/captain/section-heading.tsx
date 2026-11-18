import { useT } from '@/core/i18n/client';
import Link from 'next/link';
import { buttonClass } from '@/ui/button';
import { RowChevron } from '@/ui/row-chevron';
import { messages } from '../../captain-sections/messages';
import { messages as phoneMessages } from '../../captain-phone/messages';
import { connectedToolsMessages } from '@/features/ai-connect';
import type { Section } from './section-nav';

export function SectionHeading({ section, overviewHref }: { section: Section; overviewHref?: string }) {
  const t = useT(messages), tools = useT(connectedToolsMessages);
  const phone = useT(phoneMessages);
  if (section === 'connected-tools') return <header className="space-y-stack">
    <div className="flex items-center gap-stack">
      {overviewHref && <Link href={overviewHref} aria-label={phone('back')} className={buttonClass({
        variant: 'secondary', block: false, className: 'min-w-12 shrink-0 rounded-full! px-inline md:hidden!',
      })}><RowChevron className="rotate-180" /></Link>}
      <h2 id="settings-heading" tabIndex={-1} className="text-h font-extrabold">{tools('connectedTools')}</h2>
    </div>
    <p className="text-sm text-muted">{tools('intro')}</p>
  </header>;
  return <header>
    <h2 id="settings-heading" tabIndex={-1} className="font-display text-title font-semibold">{t(section)}</h2>
    <p className="text-sm text-muted">{t(`${section}Hint`)}</p>
  </header>;
}

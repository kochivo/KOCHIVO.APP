import Link from 'next/link';
import { Bell, CreditCard, FileText, Link2, MessageCircle, Plug, UserRound } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { connectedToolsMessages } from '@/features/ai-connect';
import { messages } from '../../captain-sections/messages';

const icons = { profile: UserRound, page: Link2, invite: MessageCircle, language: Bell, subscription: CreditCard,
  security: FileText, 'connected-tools': Plug };
export type Section = keyof typeof icons;

export function selectedSection(value: string | null, connectedTools = false): Section {
  if (value === 'connected-tools' && !connectedTools) return 'profile';
  return value && Object.hasOwn(icons, value) ? value as Section : 'profile';
}

export function SectionNav({ section, query, connectedTools }: { section: Section; query: string; connectedTools?: boolean }) {
  const t = useT(messages), tools = useT(connectedToolsMessages);
  return <nav aria-label={t('sections')} className="glass grid grid-cols-2 gap-inline rounded-card p-inline min-[760px]:grid-cols-1">
    {(Object.keys(icons) as Section[]).filter(id => id !== 'connected-tools' || connectedTools).map(id => {
      const params = new URLSearchParams(query);
      params.set('section', id);
      const Icon = icons[id];
      return <Link key={id} href={`?${params}`} scroll={false} aria-current={section === id ? 'page' : undefined}
        className="press relative flex min-h-12 items-center gap-inline rounded-control px-stack text-row text-muted hover:bg-ink/5 hover:text-ink aria-[current=page]:nav-slash aria-[current=page]:bg-ink/5 aria-[current=page]:font-semibold aria-[current=page]:text-ink">
        <Icon aria-hidden className={section === id ? 'size-4 shrink-0 text-lime' : 'size-4 shrink-0'} />
        {id === 'connected-tools' ? tools('connectedTools') : t(id)}
      </Link>;
    })}
  </nav>;
}

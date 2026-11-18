import { useT } from '@/core/i18n/client';
import { messages } from '../../captain-sections/messages';
import type { Section } from './section-nav';

export function SectionHeading({ section }: { section: Section }) {
  const t = useT(messages);
  return <header>
    <h2 id="settings-heading" tabIndex={-1} className="font-display text-title font-semibold">{t(section)}</h2>
    <p className="text-sm text-muted">{t(`${section}Hint`)}</p>
  </header>;
}

import type { Locale } from '@/core/i18n/locale';
import { PillNav } from '@/ui/pill-nav';
import { playerNav } from '../nav';

export function PlayerTabsView({ pathname, locale, label, onSelect }: {
  pathname: string; locale: Locale; label: string; onSelect?: (href: string) => void;
}) {
  const items = playerNav(pathname, locale).map(item => onSelect ? { ...item, href: `#${item.href}` } : item);
  return <PillNav aria-label={label} items={items}
    onClickCapture={onSelect ? event => {
      const link = (event.target as Element).closest('a');
      if (link) { event.preventDefault(); onSelect((link.getAttribute('href') ?? '').replace(/^#/, '')); }
    } : undefined} />;
}

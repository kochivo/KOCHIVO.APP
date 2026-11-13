import { Button } from '@/ui';
import { KoInvite } from '@/ui/icons';

export function PublicSignup({ href, label, secondary = false }: { href: string; label: string; secondary?: boolean }) {
  const [action, query] = href.split('?');
  return <form action={action} method="get">
    {[...new URLSearchParams(query)].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <Button type="submit" variant={secondary ? 'secondary' : 'primary'} className="w-full rounded-full md:w-auto">
      <KoInvite aria-hidden className="size-5" />{label}
    </Button>
  </form>;
}

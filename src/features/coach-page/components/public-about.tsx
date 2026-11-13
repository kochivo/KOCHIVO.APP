import { Camera, Link as LinkIcon, MessageCircle, Music2, Users, Video } from 'lucide-react';
import type { PublicCoach, PublicT } from './public-types';
import { httpsSocialUrl } from './public-social-url';

export function PublicAbout({ coach, t }: { coach: PublicCoach; t: PublicT }) {
  const socials = [['whatsapp', MessageCircle], ['instagram', Camera], ['tiktok', Music2], ['facebook', Users], ['youtube', Video], ['x', LinkIcon]] as const;
  const links = socials.flatMap(([key, Icon]) => {
    const href = httpsSocialUrl(coach.social[key]);
    return href ? [{ key, Icon, href }] : [];
  });
  return <section className="public-section grid gap-10 md:grid-cols-[1.4fr_1fr]">
    <div><p className="mb-3 text-sm text-lime">{t('aboutTitle')}</p><h2 className="public-heading">{coach.full_name}</h2>
      <p className="mt-6 max-w-prose whitespace-pre-wrap text-base leading-loose text-muted">{coach.bio?.trim() || t('noBio')}</p>
    </div>
    <div className="space-y-6">
      {coach.location && <dl className="glass flex justify-between gap-6 rounded-card p-6"><dt className="text-muted">{t('locationLabel')}</dt><dd>{coach.location}</dd></dl>}
      <div data-slot="facts" />
      {links.length ? <ul className="flex flex-wrap gap-3">{links.map(({ key, Icon, href }) => <li key={key}>
        <a href={href} aria-label={t(key)} target="_blank" rel="noopener noreferrer" className="glass flex size-12 items-center justify-center rounded-full hover:text-lime">
          <Icon aria-hidden strokeWidth={1.5} className="size-5" />
        </a>
      </li>)}</ul> : <p className="text-muted">{t('noSocial')}</p>}
    </div>
  </section>;
}

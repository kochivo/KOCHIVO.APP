import { Play } from 'lucide-react';
import { content } from '../content';
import { Slogan } from './slogan';
import { PreviewToggle } from './preview-toggle';
import { PreviewPlayer } from './preview-player';
import { PreviewCaptain } from './preview-captain';

export function Hero() {
  return <section className="marketing-wrap flex flex-wrap items-center gap-14 pt-16 lg:pt-22">
    <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-[22px]">
      <p className="marketing-eyebrow">{content.hero.eyebrow}</p>
      <Slogan />
      <p className="marketing-after max-w-[540px] text-lg leading-relaxed text-muted">{content.seo.description}</p>
      <div className="marketing-after flex flex-wrap gap-3">
        <a href={content.links.signup} className="marketing-primary min-h-16 px-7 text-lg">{content.hero.signup}</a>
        {/* TODO(T-012c): point to the real demo when demo accounts are available. */}
        <a href={content.links.demo} className="marketing-ghost glass min-h-16 gap-2 px-5"><Play size={18} aria-hidden="true" />{content.hero.demo}</a>
      </div>
      <details className="text-sm text-muted"><summary className="flex min-h-12 cursor-pointer items-center text-lime">{content.hero.invite}</summary><p className="py-2">{content.hero.inviteNote}</p></details>
    </div>
    <PreviewToggle player={<PreviewPlayer />} captain={<PreviewCaptain />} />
  </section>;
}

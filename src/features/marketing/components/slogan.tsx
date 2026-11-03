import { getLocale } from '@/core/i18n/server';
import { localeDir } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';

export async function Slogan() {
  const t = await getT(messages);
  const content = getContent(t);
  const direction = localeDir(await getLocale());
  return <>
    <h1 aria-label={content.hero.label} className="marketing-slogan" dir={direction}>
      <span className="block">{content.hero.lines[0]}</span>
      <span className="marketing-outline block">{content.hero.lines[1]}</span>
      <span className="block text-lime">{content.hero.lines[2]}<span className="text-ink">{content.hero.period}</span></span>
    </h1>
    <div className="marketing-after flex flex-col items-start gap-3">
      <span aria-hidden="true" className="marketing-beam h-1 w-14 rounded bg-lime" />
      <p className="font-display text-2xl font-bold">{content.hero.arabic}</p>
    </div>
  </>;
}

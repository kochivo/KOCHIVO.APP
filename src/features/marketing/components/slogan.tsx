import { content } from '../content';

export function Slogan() {
  return <>
    <h1 aria-label={content.hero.label} className="marketing-slogan" dir="rtl">
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

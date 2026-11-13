import { getT } from '@/core/i18n/server';
import { KoTraining, KoFoods, KoForms, KoFollowup, KoProgress, KoBilling } from '@/ui/icons';
import { Sparkles, Trophy } from 'lucide-react';
import { messages } from '../messages';
import { getContent } from '../content';
import { StatsStrip } from './stats-strip';

const icons = { workout: KoTraining, meals: KoFoods, inbox: KoForms, radar: KoFollowup, readiness: KoProgress, billing: KoBilling, assistant: Sparkles, ranking: Trophy };

export async function FeaturesGrid() {
  const content = getContent(await getT(messages));
  return <section id="features" className="marketing-wrap marketing-section space-y-8">
    <p className="marketing-eyebrow">{content.featuresHeading.label}</p><h2 className="marketing-heading">{content.featuresHeading.title}</h2>
    {await StatsStrip()}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{content.features.map((feature, i) => {
      const Icon = icons[feature.icon];
      return <article key={feature.icon} className={`glass flex flex-col gap-4 rounded-card p-6 ${feature.soon ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between"><Icon aria-hidden="true" className="size-7 text-lime" /><span className="text-sm text-muted">{content.numbers[i]}</span></div>
        <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">{feature.t}{feature.soon && <span className="rounded-chip border border-line px-2 py-1 text-xs text-muted">{content.soon}</span>}</h3>
        <p className="text-sm leading-relaxed text-muted">{feature.d}</p>
      </article>;
    })}</div>
  </section>;
}

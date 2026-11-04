import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import { Activity, Copy, Dumbbell, Inbox, Pill, Radar, Scan, Utensils } from 'lucide-react';

const icons = { workout: Dumbbell, templates: Copy, meals: Utensils, supplements: Pill, radar: Radar, inbox: Inbox, readiness: Activity, muscles: Scan };

export async function FeaturesGrid() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="features" className="marketing-wrap marketing-reveal marketing-section space-y-9">
    <div className="max-w-[640px] space-y-3"><p className="marketing-eyebrow">{content.featuresHeading.label}</p><h2 className="marketing-heading">{content.featuresHeading.title}</h2></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{content.features.map(feature => {
      const Icon = icons[feature.icon];
      return <article key={feature.icon} className="glass flex min-h-[220px] flex-col gap-3.5 rounded-[28px] p-6"><span className="grid size-13 place-items-center rounded-control border border-line bg-ink/5 text-ink"><Icon aria-hidden="true" size={24} /></span><h3 className="text-[22px] font-extrabold">{feature.t}</h3><p className="text-[15px] leading-relaxed text-muted">{feature.d}</p></article>;
    })}</div>
  </section>;
}

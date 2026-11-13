import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';
import { WhiteLabelStrip } from './white-label-strip';
import { Check } from 'lucide-react';

export async function Pricing() {
  const t = await getT(messages);
  const content = getContent(t);
  return <section id="pricing" className="marketing-wrap marketing-reveal marketing-section space-y-8 text-center">
    <div className="space-y-3"><p className="marketing-eyebrow">{content.pricing.label}</p><h2 className="marketing-heading">{content.pricing.title}</h2><p className="text-[15px] text-muted">{content.pricing.description}</p></div>
    <div className="grid gap-3.5 text-start sm:grid-cols-2 lg:grid-cols-4">{content.plans.map(plan => <article key={plan.name} className={`glass-strong flex flex-col gap-3.5 rounded-[28px] p-6 ${plan.hot ? 'border-lime/60 shadow-xl shadow-lime/10' : ''}`}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2"><h3 dir="ltr" className="text-[22px] font-extrabold">{plan.name}</h3>{plan.hot && <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-extrabold text-on-lime">{content.pricing.popular}</span>}</div>
      <p className="text-sm text-muted">{plan.audience}</p>
      <p className="text-[44px] font-extrabold"><bdi>{plan.displayPrice}</bdi> <span className="text-sm font-medium text-muted">{plan.price === 0 ? content.pricing.unit : content.pricing.monthly}</span></p>
      <ul className="space-y-3 pb-3 text-sm">
        <li className="flex items-start gap-2 rounded-control bg-lime-soft p-3 font-extrabold"><Check aria-hidden="true" size={18} className="shrink-0 text-lime" />{plan.limitLabel}</li>
        {plan.checklist.map(item => <li key={item} className="flex items-start gap-2"><Check aria-hidden="true" size={18} className="shrink-0 text-lime" /><span>{item}</span></li>)}
      </ul>
      <a href={plan.price === 0 ? content.links.signup : whatsappUrl} className="mt-auto min-h-13 marketing-ghost border border-line">{plan.action}</a>
    </article>)}</div>
    <p className="text-sm font-bold">{content.pricing.allFeatures}</p>
    <p className="text-sm text-muted">{content.pricing.note}</p>
    {await WhiteLabelStrip()}
  </section>;
}

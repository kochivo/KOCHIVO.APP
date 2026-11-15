import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent, whatsappUrl } from '../content';
import { Check } from 'lucide-react';
import { buttonClass } from '@/ui/button';
import styles from './landing.module.css';

export async function Pricing() {
  const content = getContent(await getT(messages));
  return <section id="pricing" className={`${styles.wrap} ${styles.section}`}>
    <div className={styles.headingRow}><div><p className={styles.eyebrow}>{content.pricing.label}</p><h2>{content.pricing.title}</h2></div><p>{content.pricing.description}</p></div>
    <div className={styles.plans}>{content.plans.map(plan => <article key={plan.name} className={`${styles.plan} ${plan.hot ? styles.featured : ''}`}>
      <div className={styles.planTop}><h3 dir="ltr">{plan.name}</h3>{plan.hot && <span>{content.pricing.popular}</span>}</div>
      <p className={styles.price}><bdi>{plan.displayPrice}</bdi> <small>{plan.price === 0 ? content.pricing.unit : content.pricing.monthly}</small></p>
      <p className="text-md font-semibold">{plan.limitLabel}</p><p className="text-sm text-muted">{plan.audience}</p>
      <ul>{plan.checklist.map(item => <li key={item}><Check size={16} strokeWidth={1.7} aria-hidden="true" /><span>{item}</span></li>)}</ul>
      <a href={plan.price === 0 ? content.links.signup : whatsappUrl} className={buttonClass({ variant: plan.hot ? 'primary' : 'secondary', size: 'lg', block: true })}>{plan.action}</a>
    </article>)}</div>
    <p className={styles.note}>{content.pricing.note}</p>
  </section>;
}

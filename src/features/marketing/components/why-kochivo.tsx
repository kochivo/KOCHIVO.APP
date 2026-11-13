import { Check, X } from 'lucide-react';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import styles from './landing.module.css';

export async function WhyKochivo() {
  const { why } = getContent(await getT(messages));
  return <section className="marketing-wrap marketing-section space-y-8">
    <p className="marketing-eyebrow">{why.label}</p><h2 className="marketing-heading max-w-xl">{why.title}</h2>
    <div className={`grid gap-4 md:grid-cols-2 ${styles.comparison}`}>
      {[false, true].map(after => <article key={String(after)} className={`${after ? 'glass-strong' : 'glass'} space-y-6 rounded-card p-6 md:p-8`}>
        <h3 className="text-xl font-bold">{after ? why.after : why.before}</h3>
        <ul className="space-y-5">{(after ? why.afterList : why.beforeList).map(item => <li key={item} data-tick={after || undefined} className="flex items-start gap-3 text-sm leading-relaxed">
          {after ? <Check size={20} aria-hidden="true" className="shrink-0 text-lime" /> : <X size={20} aria-hidden="true" className="shrink-0 text-muted" />}{item}
        </li>)}</ul>
      </article>)}
    </div>
  </section>;
}

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { getContent } from '../content';
import { StoryScreens } from './story-screens';
import styles from './landing.module.css';

export async function HowItWorks() {
  const content = getContent(await getT(messages));
  return <section id="day" className="marketing-wrap marketing-section space-y-8">
    <p className="marketing-eyebrow">{content.how.today}</p>
    <h2 className="marketing-heading">{content.how.title[0]}<br />{content.how.title[1]}</h2>
    <div data-story className={styles.story}>
      <div className={styles.pin}>
        <span data-slash aria-hidden="true" className={styles.slash} />
        {await StoryScreens()}
        <div aria-hidden="true" className={styles.rail}>{content.feed.map((item, i) => <i key={item.at} data-rail={i} data-active={i === 0} />)}</div>
        <p className="pt-3 text-center text-xs text-muted">{content.sample.label}</p>
      </div>
      <div className={styles.steps}>{content.feed.map((item, i) => <div key={item.at} data-step={i} data-active={i === 0} className={styles.step}>
        <time dir="ltr" className="text-start text-3xl font-extrabold text-lime">{item.at}</time>
        <h3 className="text-2xl font-bold">{item.t}</h3><p className="max-w-md leading-relaxed text-muted">{content.story.descriptions[i]}</p>
      </div>)}</div>
    </div>
  </section>;
}

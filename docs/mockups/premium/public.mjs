import { messages as m } from './messages.ts';
import { brand, go, act, photo, footer, heading, icon, list, avatar } from './ui.mjs';

export const siteHeader = () => `<header class="k-site-nav">${brand()}<nav><button type="button" class="k-button" data-anchor="how">${m.how}</button><button type="button" class="k-button" data-anchor="pricing">${m.pricing}</button>${go(m.signIn, 'login')}</nav></header>`;

function landing() {
  return `${siteHeader()}<section class="k-landing-hero">${photo('k-editorial-image')}<div class="k-hero-copy"><p class="k-eyebrow">${m.siteEyebrow}</p>
    <h1 dir="ltr">${m.slogan.map((line, i) => `<span${i === 1 ? ' class="k-outline"' : ''}>${line}</span>`).join('')}</h1>
    <p class="k-hero-arabic">${m.siteLead} ${m.siteLeadTwo}</p><p class="k-hero-body">${m.siteBody}</p>
    <div class="k-action-row">${go(m.startFree, 'login', true, 'arrow-up-left')}${go(m.tryDemo, 'demo')}</div><small>${m.siteNote}</small></div></section>
    <section class="k-public-section" id="k-how"><div class="k-editorial-heading"><p class="k-eyebrow">${m.how}</p><h2>${m.siteSection}</h2><p>${m.siteSectionBody}</p></div>
    <div class="k-process">${m.siteSteps.map(([n, title, body]) => `<div><span class="k-process-no" dir="ltr">${n}</span><h3>${title}</h3><p>${body}</p></div>`).join('')}</div></section>
    <section class="k-public-split"><div><p class="k-eyebrow">${m.demoPlayer}</p><h2>${m.sitePlayer}</h2><p>${m.sitePlayerBody}</p>${go(m.demoPlayer, 'player-home', false, 'arrow-up-left')}</div>
      <div class="k-mini-workout"><small>${m.trainingDay}</small><h3>${m.playerWorkoutTitle}</h3><p>${m.playerWorkoutSub}</p><div class="k-mini-exercise">${icon('dumbbell')}<span>${m.workoutTitle}</span><span dir="ltr">3 × 8–10</span></div>${go(m.startWorkout, 'workout', true)}</div></section>
    <section class="k-public-section" id="k-pricing"><div class="k-editorial-heading"><p class="k-eyebrow">${m.pricing}</p><h2>${m.sitePricing}</h2><p>${m.sitePricingHint}</p></div>
      <div class="k-pricing-list">${m.plans.map(([name, price, hint], i) => `<div><h3 dir="ltr">${name}</h3><p>${hint}</p><strong dir="ltr">${price}</strong><small>${m.currency}</small>${go(i ? m.next : m.startFree, 'login', i === 1)}</div>`).join('')}</div></section>
    <section class="k-public-section k-faq">${heading(m.faq, '')}${m.questions.map(([q, a]) => `<details><summary>${q}${icon('plus')}</summary><p>${a}</p></details>`).join('')}</section>
    <section class="k-final-cta"><h2>${m.footer}</h2>${go(m.startFree, 'login', true, 'arrow-up-left')}</section>${footer()}`;
}

export function renderPublic(page) {
  if (page.id === 'site') return landing();
  if (page.id === 'coach-site') return `${siteHeader()}<section class="k-coach-public"><div class="k-coach-photo">${photo('k-editorial-image')}<span dir="ltr">${m.coachLatin}</span></div><div><p class="k-eyebrow">${m.publicCoachEyebrow}</p>${avatar(m.coachInitials, true)}<h1>${m.publicCoachHeading}</h1><p>${m.publicCoachBody}</p>${go(m.requestJoin, 'invite', true, 'arrow-up-left')}<h2>${m.coachingIncludes}</h2>${list(m.coachingItems.map((item, i) => [item, '', `0${i + 1}`]))}</div></section>${footer()}`;
  if (page.id === 'demo') return `${siteHeader()}<section class="k-choice-page">${heading(m.demoTitle, m.demoBody)}<div class="k-role-choices"><button data-page="coach-home" type="button">${icon('layout-dashboard')}<h2>${m.demoCoach}</h2><p>${m.demoCoachHint}</p>${icon('arrow-up-left')}</button><button data-page="player-home" type="button">${icon('dumbbell')}<h2>${m.demoPlayer}</h2><p>${m.demoPlayerHint}</p>${icon('arrow-up-left')}</button></div></section>${footer()}`;
  return `${siteHeader()}<section class="k-ko-page"><span class="k-ko-monogram" dir="ltr">KO.</span>${heading(m.koTitle, m.koBody)}${act(m.koAction, 'join-ko', true, 'arrow-up-left')}</section>${footer()}`;
}

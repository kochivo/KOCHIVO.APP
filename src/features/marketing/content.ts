import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import { whatsappUrl as contactUrl } from '@/lib/whatsapp';
import { publicConfig } from '@/lib/public-config';
import { messages } from './messages';

export function getContent(t: Translator<typeof messages>) {
  return {
    brand: t('brand'), seo: { title: t('title'), description: t('landingDescription') },
    links: { signup: '/login?tab=signup', login: '/login' }, login: t('login'), signup: t('signup'),
    nav: [{ href: '#inside', label: t('inside') }, { href: '#player', label: t('playerNav') }, { href: '/demo', label: t('demoNav') }, { href: '#pricing', label: t('plans') }, { href: '#faq', label: t('faq') }],
    hero: { eyebrow: t('kicker'), arabic: t('tagline'), description: t('landingDescription'), signup: t('signupHero'), demo: t('watch'), tryDemo: t('tryTheDemo'), demoNote: t('aCoachWorkspaceWithSampleData'), invite: t('invite'), inviteNote: t('inviteLink') },
    preview: { day: t('workoutDay'), exercise: t('exercise'), weight: t('weight'), plus: t('plus'), minus: t('minus'), pr: t('record'), done: t('done') },
    why: { label: t('why'), title: t('whyTitle'), before: t('before'), after: t('after'), beforeList: t('beforeList').split('|'), afterList: t('afterList').split('|') },
    sample: { label: t('sample'), needsYou: t('needsYou'), rows: t('captainRows').split('|'), actions: t('captainActions').split('|'), finished: t('finished'), count: t('finishedCount'), sets: t('sets').split('|'), initial: t('initialWeight'), notification: t('notification'), detail: t('notificationDetail'), workout: t('workoutDetail') },
    how: { today: t('day'), title: [t('storyHeading'), t('storyHeadingEnd')] },
    feed: [{ at: t('time1'), t: t('story1') }, { at: t('time2'), t: t('story2') }, { at: t('time3'), t: t('story3') }, { at: t('time4'), t: t('story4') }],
    story: {
      descriptions: [t('storyDescription1'), t('storyDescription2'), t('storyDescription3'), t('storyDescription4')],
      titles: [t('assignTitle'), t('workoutTitle'), t('videoTitle'), t('chatTitle')],
      players: t('samplePlayers').split('|'), assign: t('assignAction'), exercises: t('workoutRows').split('|'), sets: t('workoutSets').split('|'), logged: t('workoutLogged'), video: t('videoDetail'), question: t('question'), reply: t('reply'), sent: t('sent'),
    },
    soon: t('soon'), numbers: t('featureNumbers').split('|'),
    stats: [{ v: t('exerciseCount'), l: t('animatedExercises'), count: 1300 }, { v: t('egyptianFood'), l: t('foodDetail'), count: 0 }, { v: t('threeTaps'), l: t('everyday'), count: 3 }],
    featuresHeading: { label: t('everything'), title: t('nothingExtra') },
    features: [
      { icon: 'workout', t: t('builder'), d: t('builderDescription'), soon: false },
      { icon: 'meals', t: t('meals'), d: t('mealsDescription'), soon: false },
      { icon: 'inbox', t: t('inbox'), d: t('inboxDescription'), soon: false },
      { icon: 'radar', t: t('radar'), d: t('radarDescription'), soon: false },
      { icon: 'readiness', t: t('readinessFeature'), d: t('readinessDetail'), soon: false },
      { icon: 'billing', t: t('billingFeature'), d: t('billingDescription'), soon: false },
      { icon: 'assistant', t: t('assistant'), d: t('assistantDescription'), soon: true },
      { icon: 'ranking', t: t('ranking'), d: t('rankingDescription'), soon: true },
    ],
    pricing: { label: t('plans'), title: t('pricingTitle'), description: t('choosePlan'), note: t('renewalNote'), popular: t('popular'), unit: t('pounds'), monthly: t('monthly') },
    // Each tier owns its inclusions so future extras can be changed independently.
    plans: [
      { name: t('entry'), audience: t('entryAudience'), price: 0, displayPrice: t('freePrice'), limit: 5, limitLabel: t('limit5'), action: t('signup'), hot: false,
        checklist: [t('planTraining'), t('planTemplates'), t('planMedia'), t('planReadiness'), t('planBilling')] },
      { name: t('champion'), audience: t('championAudience'), price: 399, displayPrice: t('championPrice'), limit: 20, limitLabel: t('limit20'), action: t('subscribe'), hot: false,
        checklist: [t('planTraining'), t('planTemplates'), t('planMedia'), t('planReadiness'), t('planBilling')] },
      { name: t('legend'), audience: t('legendAudience'), price: 699, displayPrice: t('legendPrice'), limit: 40, limitLabel: t('limit40'), action: t('subscribe'), hot: true,
        checklist: [t('planTraining'), t('planTemplates'), t('planMedia'), t('planReadiness'), t('planBilling')] },
      { name: t('empire'), audience: t('empireLine'), price: 1499, displayPrice: t('empirePrice'), limit: 100, limitLabel: t('limit100'), action: t('subscribe'), hot: false,
        checklist: [t('planTraining'), t('planTemplates'), t('planMedia'), t('planReadiness'), t('planBilling')] },
    ],
    faqHeading: { label: t('faq'), title: t('faqTitle') },
    faq: [{ q: t('faq1'), a: t('answer1') }, { q: t('faq2'), a: t('answer2') }, { q: t('faqTransfer'), a: t('answerTransfer') }, { q: t('faq3'), a: t('answer3') }, { q: t('faq4'), a: t('answer4') }],
    final: { title: t('closingTitle'), note: t('closingNote'), action: t('createAccount') },
    footer: { copyright: t('copyright'), credit: t('credit'), support: t('support'), privacy: t('privacy'), terms: t('terms') },
  } as const;
}

export const content = getContent(createT(messages, 'ar'));
// Public config always supplies a digit-only contact number.
export const whatsappUrl = contactUrl({ phone: publicConfig.ownerWhatsapp })!;

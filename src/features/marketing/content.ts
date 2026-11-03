import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import { messages } from './messages';
import { whatsappUrl as contactUrl } from '@/lib/whatsapp';
import { publicConfig } from '@/lib/public-config';

type Plan = { name: string; price: number; displayPrice: string; limit: number; limitLabel: string; hot: boolean; action: string };
type Detail = { t: string; d: string };

export function getContent(t: Translator<typeof messages>) {
  return {
  brand: t('brand'),
  seo: { title: t('kochivoAllYourPlayersInOne'), description: t('everyPlayerSTrainingMealsAnd') },
  whatsappNumber: publicConfig.ownerWhatsapp,
  links: { signup: '/login?tab=signup', demo: '/demo' },
  nav: [{ href: '#how', label: t('howItWorks') }, { href: '#features', label: t('features') }, { href: '#pricing', label: t('plans') }, { href: '#faq', label: t('faq') }],
  login: t('signIn'), signup: t('startFree'), contact: t('chatOnWhatsApp'),
  hero: { eyebrow: t('forOnlineCoaches'), lines: [t('yourNextStep'), t('starts'), t('here')], period: t('period'), label: t('yourNextStepStartsHere'), arabic: t('yourNextStepStartsHere'), signup: t('startFreeUpTo5Players'), demo: t('tryTheDemo'), demoNote: t('aCoachWorkspaceWithSampleData'), invite: t('gotAPlayerInvite'), inviteNote: t('openTheInviteLinkYourCoach') },
  preview: { player: t('playerView'), captain: t('coachView'), label: t('previewSampleData'), day: t('day2ChestAndTriceps'), exercise: t('barbellBenchPress'), weightLabel: t('weightKg'), weight: t('weight'), plus: t('plus'), minus: t('minus'), pr: t('newRecord'), record: t('previewRecord'), done: t('setDone'), radar: t('needsAttention'), heading: t('driftingPlayers'), send: t('messageOnWhatsApp'), waiting: t('videosWaitingForFeedback'), videos: t('videos') },
  radar: [
    { name: t('karimAdel'), days: t('fourDays'), reason: t('noWorkoutLoggedSinceSaturday') },
    { name: t('mohamedTarek'), days: t('threeDays'), reason: t('weeklyCheckInOverdue') },
    { name: t('mostafaAli'), days: t('twoDaysLeft'), reason: t('subscriptionEndingSoon') },
  ],
  stats: [{ v: t('exerciseCount'), l: t('animatedExercises') }, { v: t('foodCount'), l: t('egyptianFoodsWithMacros') }, { v: t('threeTaps'), l: t('forEverydayTasks') }, { v: t('offline'), l: t('playersCanLogOffline') }],
  how: { label: t('howItWorks'), title: [t('fromPlanToFeedback'), t('inMinutes')], today: t('aCoachSDay'), example: t('sampleData') },
  steps: [
    { n: t('stepOne'), t: t('buildThePlan'), d: t('startWithATemplateOrBuild') },
    { n: t('stepTwo'), t: t('playersLog'), d: t('todaySWorkoutWeightsAndReps') },
    { n: t('stepThree'), t: t('youGiveFeedback'), d: t('seeWhoSDoneWhoS') },
  ],
  feed: [{ t: t('pushPlanAssignedToSara'), at: t('feedAssignedAt') }, { t: t('saraFinishedTodaySWorkout'), at: t('feedWorkoutAt') }, { t: t('saraSentASquatVideo'), at: t('feedVideoAt') }, { t: t('yourFeedbackLowerMoreSlowly'), at: t('feedFeedbackAt') }],
  featuresHeading: { label: t('forCoaches'), title: t('everythingYouNeedKeepItSimple') },
  features: [
    { n: t('featureOne'), t: t('workoutBuilder'), d: t('supersetsReadyMadeTemplatesAndOver') },
    { n: t('featureTwo'), t: t('flexibleMealPlans'), d: t('macrosUpdateAsYouBuildPlayers') },
    { n: t('featureThree'), t: t('dropOffRadar'), d: t('spotPlayersWhoHavenTLogged') },
    { n: t('featureFour'), t: t('oneInbox'), d: t('formVideosCheckInPhotosAnd') },
  ],
  playerHeading: { label: t('forPlayers'), title: [t('builtForTheGym'), t('oneHand')], description: t('freeForPlayersNoAppStore') },
  // The board's timer claim contradicts ARCHITECTURE §9; leave it pending owner review.
  player: [
    { t: t('focusMode'), d: t('oneExerciseAtATimeBig') },
    { t: t('offline'), d: t('savedOnYourPhoneSyncedAutomatically') },
    { t: t('personalBest'), d: t('celebrateEveryNewRecordOnScreen') },
    { t: t('recordAndSend'), d: t('uploadYourSetVideoWhileYou') },
    { t: t('feelsLikeAnApp'), d: t('addItToYourHomeScreen') },
  ] satisfies Detail[],
  pricing: { label: t('plans'), title: t('roomForEveryPlayer'), description: t('noAutomaticBillingSubscribeOnWhatsApp'), note: t('noAutoRenewalActivateOnWhatsApp'), popular: t('mostPopular'), unit: t('egp'), monthly: t('egpMonth') },
  // Prices confirmed by the owner on 2026-11-03. The DB plan limits must match these.
  plans: [
    { name: t('planEntry'), price: 0, displayPrice: t('priceFree'), limit: 5, limitLabel: t('upTo5Players'), action: t('startFree'), hot: false },
    { name: t('planChampion'), price: 399, displayPrice: t('priceChampion'), limit: 20, limitLabel: t('upTo20Players'), action: t('subscribe'), hot: false },
    { name: t('planLegend'), price: 699, displayPrice: t('priceLegend'), limit: 40, limitLabel: t('upTo40Players'), action: t('subscribe'), hot: true },
    { name: t('planEmpire'), price: 1499, displayPrice: t('priceEmpire'), limit: 100, limitLabel: t('upTo100Players'), action: t('subscribe'), hot: false },
  ] satisfies Plan[],
  whiteLabel: t('wantYourGymSNameAnd'),
  faqHeading: { label: t('faq'), title: t('beforeYouStart') },
  faq: [
    { q: t('doPlayersPay'), a: t('noCoachesSubscribePlayersJoinFree') },
    { q: t('doesItWorkOffline'), a: t('yesWorkoutsAndMealsAreSaved') },
    { q: t('doINeedTheAppStore'), a: t('noOpenItInYourBrowser') },
    { q: t('canOtherCoachesSeeMyPlayers'), a: t('noEachCoachCanOnlyAccess') },
    { q: t('whatIfASubscriptionEndsOr'), a: t('nothingIsDeletedPlayersKeepAccess') },
  ],
  final: { title: t('startWithYourFirstPlayerToday'), action: t('createYourCoachAccount') },
  footer: { copyright: t('copyright'), credit: t('mediaCredit'), privacy: t('privacy'), terms: t('terms'), support: t('whatsappSupport') },
} as const;
}

export const content = getContent(createT(messages, 'ar'));

// The configured marketing number contains digits, so a contact link is guaranteed.
export const whatsappUrl = contactUrl({ phone: content.whatsappNumber })!;

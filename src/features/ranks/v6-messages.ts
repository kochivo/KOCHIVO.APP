import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { 'summary.one': "نقطة واحدة · فاضلك {needed} على {tier}",
    'summary.two': "نقطتين · فاضلك {needed} على {tier}",
    'summary.few': "{points} نقط · فاضلك {needed} على {tier}",
    'summary.many': "{points} نقطة · فاضلك {needed} على {tier}",
    'summary.other': "{points} نقطة · فاضلك {needed} على {tier}", prize: 'جايزة: {prize}', you: 'إنت',
    adherence: 'التزامك {n}%', others: 'الالتزام {n}%', details: 'تفاصيل سباق التاج' },
  en: { 'summary.one': "{points} point · {needed} to {tier}",
    'summary.other': "{points} points · {needed} to {tier}", prize: 'Prize: {prize}', you: 'You',
    adherence: '{n}% adherence', others: '{n}% adherence', details: 'Crown race details' },
});

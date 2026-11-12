import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { title: 'تطورك', history: 'سجل تماريني', weight: 'الوزن', kg: 'كجم',
    lost: 'نزلت {value} كجم من البداية', gained: 'زِدت {value} كجم من البداية', remaining: 'فاضل {value} للهدف',
    nextRank: 'فاضلك {points} نقطة على {tier}', retry: 'جرّب تاني', rankFailed: 'مش قادرين نحمّل الرتبة',
    goalFailed: 'مش قادرين نحمّل هدف الوزن', noWeight: 'سجّل وزنك في المتابعة عشان تشوف تطورك' },
  en: { title: 'Your progress', history: 'My workout history', weight: 'Weight', kg: 'kg',
    lost: 'Down {value} kg since starting', gained: 'Up {value} kg since starting', remaining: '{value} to your goal',
    nextRank: '{points} points to {tier}', retry: 'Try again', rankFailed: 'Could not load your rank',
    goalFailed: 'Could not load your weight goal', noWeight: 'Record your weight in a check-in to see progress' },
});

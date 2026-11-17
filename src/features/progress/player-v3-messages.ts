import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/player-v3-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { workouts: 'التمارين', volume: 'إجمالي الأوزان', chartToday: 'النهارده', title: 'تطورك', range: 'المدة', month: 'شهر', quarter: '3 شهور', weight: 'وزنك', kg: 'كجم',
    up: 'زدت {value} كجم', down: 'نزلت {value} كجم', log: 'سجّل وزن النهارده', strength: 'قوتك',
    delta: '{value} من أول البرنامج', history: 'كل تمارينك اللي فاتت', noWeight: 'سجّل وزنك أول مرة',
    noStrength: 'لسه مافيش تمارين كفاية للرسم' },
  en: { workouts: 'Workouts', volume: 'Total volume', chartToday: 'Today', title: 'Your progress', range: 'Range', month: 'Month', quarter: '3 months', weight: 'Your weight', kg: 'kg',
    up: 'Up {value} kg', down: 'Down {value} kg', log: 'Log today’s weight', strength: 'Your strength',
    delta: '{value} since starting', history: 'All your past workouts', noWeight: 'Log your first weight',
    noStrength: 'Not enough workouts to chart yet' },
});

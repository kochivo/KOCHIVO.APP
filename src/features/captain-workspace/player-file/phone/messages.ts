import { defineMessages } from '@/core/i18n/messages';

const arStd = { overview: 'نظرة عامة', training: 'البرنامج', nutrition: 'التغذية', checkins: 'المتابعات',
  money: 'المدفوعات', edit: 'عدّل البرنامج', week: 'هذا الأسبوع', dayStatus: '{day}: {status}',
  trained: 'تم التدريب', unlogged: 'لا يوجد تمرين مسجّل' } as const;

export const phoneMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { overview: 'نظرة عامة', training: 'البرنامج', nutrition: 'الأكل', checkins: 'المتابعات',
    money: 'الفلوس', edit: 'عدّل البرنامج', week: 'الأسبوع ده', dayStatus: '{day}: {status}',
    trained: 'اتمرّن', unlogged: 'مفيش تمرين متسجّل' },
  en: { overview: 'Overview', training: 'Program', nutrition: 'Food', checkins: 'Check-ins',
    money: 'Money', edit: 'Edit program', week: 'This week', dayStatus: '{day}: {status}',
    trained: 'Trained', unlogged: 'No workout logged' },
});

// The i18n gating test reads every messages.ts by this name.
export { phoneMessages as messages };

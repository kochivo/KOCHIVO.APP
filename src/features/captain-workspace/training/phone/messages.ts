import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  back: 'رجوع',
  day: 'اليوم {n}',
  dayPosition: 'اليوم {n} من {total}',
  addDay: 'يوم',
  addExercise: 'أضف تمريناً',
  sets: 'مج',
  reps: 'تكرار',
  saveAndSend: 'احفظ وأرسل للاعبين ({n})',
  chooseAndSend: 'احفظ وأرسل للاعبين',
  seconds: 'ث',
} as const;

export const messages = defineMessages({
  ar: {
    back: 'ارجع', day: 'اليوم {n}', dayPosition: 'اليوم {n} من {total}', addDay: 'يوم',
    addExercise: 'ضيف تمرين', sets: 'ست', reps: 'عدة',
    saveAndSend: 'احفظ وابعت للاعبين ({n})', chooseAndSend: 'احفظ وابعت للاعبين', seconds: 'ث',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    back: 'Back', day: 'Day {n}', dayPosition: 'Day {n} of {total}', addDay: 'Day',
    addExercise: 'Add exercise', sets: 'sets', reps: 'reps',
    saveAndSend: 'Save and send to players ({n})', chooseAndSend: 'Save and send to players', seconds: 's',
  },
});

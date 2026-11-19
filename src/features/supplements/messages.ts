import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    title: 'المكملات', today: 'مكملات النهارده', empty: 'لسه مفيش مكملات', loading: 'بنحمّل المكملات',
    error: 'مش قادرين نحفظ أو نحمّل المكملات. جرّب تاني.', retry: 'جرّب تاني', add: 'ضيف مكمل', edit: 'عدّل',
    archive: 'أرشف', up: 'طلّع لفوق', down: 'نزّل لتحت', name: 'اسم المكمل', dose: 'الجرعة', timing: 'المعاد',
    notes: 'ملاحظات', save: 'احفظ', cancel: 'إلغاء', tick: 'أخدت {name}', adherence: 'الالتزام آخر 7 أيام: {taken} / {eligible}',
    score: 'التزام المكملات: {percent}٪', morning: 'الصبح', pre_workout: 'قبل التمرين', post_workout: 'بعد التمرين',
    with_meal: 'مع الأكل', before_bed: 'قبل النوم', any: 'أي وقت',
  },
  en: {
    title: 'Supplements', today: "Today's supplements", empty: 'No supplements yet', loading: 'Loading supplements',
    error: 'Could not save or load supplements. Try again.', retry: 'Try again', add: 'Add supplement', edit: 'Edit',
    archive: 'Archive', up: 'Move up', down: 'Move down', name: 'Supplement name', dose: 'Dose', timing: 'Timing',
    notes: 'Notes', save: 'Save', cancel: 'Cancel', tick: 'Taken {name}', adherence: 'Last 7 days: {taken} / {eligible}',
    score: 'Supplement adherence: {percent}%', morning: 'Morning', pre_workout: 'Before workout', post_workout: 'After workout',
    with_meal: 'With a meal', before_bed: 'Before bed', any: 'Any time',
  },
});

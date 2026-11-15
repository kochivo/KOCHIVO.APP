const arStd = {
  title: 'متابعة الدورة', prompt: 'هل تريدين تفعيل متابعة الدورة؟', yes: 'نعم', no: 'لا شكرًا',
  privacy: 'لا يراها غيرك', log: 'سجّلي اليوم الأول', light: 'يومك الأول · تمرين أخف اليوم',
  hint: 'الأوزان أقل 15٪ اليوم.', usual: 'تمرّني كالمعتاد', captain: 'ماذا يرى المدرب؟ «يوم خفيف» فقط.',
  cycleDays: 'متوسط أيام الدورة', periodDays: 'أيام الحيض', lightDays: 'أيام التمرين الخفيف',
  photosCaptain: 'مدربتي', photosShare: 'في بطاقة التحول', error: 'تعذّر حفظ التغيير. حاولي مجددًا.',
  retry: 'حاولي مجددًا', save: 'احفظي', loading: 'جارٍ تحميل الإعدادات',
} as const;
export const messages = {
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    title: 'متابعة الدورة', prompt: 'تحبي تشغّلي متابعة الدورة؟', yes: 'آه', no: 'لا شكرًا',
    privacy: 'محدش يشوفها غيرك', log: 'سجلي أول يوم', light: 'يومك الأول · تمرين أخف النهارده',
    hint: 'الأوزان أقل 15٪ النهارده.', usual: 'اتمرني عادي', captain: 'الكابتن بيشوف إيه؟ «يوم خفيف» بس.',
    cycleDays: 'متوسط أيام الدورة', periodDays: 'أيام الحيض', lightDays: 'أيام التمرين الخفيف',
    photosCaptain: 'الكابتنة بتاعتي', photosShare: 'في كارت التحول', error: 'مقدرناش نحفظ التغيير. جربي تاني.',
    retry: 'جربي تاني', save: 'احفظي', loading: 'بنحمّل الإعدادات',
  },
  en: {
    title: 'Cycle tracking', prompt: 'Would you like to enable cycle tracking?', yes: 'Yes', no: 'No thanks',
    privacy: 'Only you can see this', log: 'Log day one', light: 'Day one · Lighter training today',
    hint: 'Target loads are 15% lighter today.', usual: 'Train as usual', captain: 'Your coach sees only “Light day”.',
    cycleDays: 'Average cycle days', periodDays: 'Period days', lightDays: 'Light days',
    photosCaptain: 'My coach', photosShare: 'On transformation cards', error: 'Could not save. Try again.',
    retry: 'Try again', save: 'Save', loading: 'Loading settings',
  },
};

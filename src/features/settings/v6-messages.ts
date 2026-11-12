import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { title: 'حسابي', coach: 'مع كابتن {name} · باقي {n} يوم', language: 'اللغة',
    arabic: 'مصري', arabicEgyptian: 'مصري', arabicStandard: 'فصحى', english: 'English',
    units: 'الوحدات', metric: 'كجم', imperial: 'lb', reminder: 'تذكير التمرين',
    reminderInfo: 'التذكير بيتبعت حسب خطة التمرين', install: 'نزّل التطبيق على الموبايل',
    logout: 'خروج', ko: 'KO مساعدك في الجيم', soon: 'قريبًا', more: 'إعدادات تانية',
    error: 'الحفظ متعملش. جرّب تاني.' },
  en: { title: 'My account', coach: 'With coach {name} · {n} days left', language: 'Language',
    arabic: 'Egyptian', arabicEgyptian: 'Egyptian', arabicStandard: 'Standard Arabic', english: 'English',
    units: 'Units', metric: 'kg', imperial: 'lb', reminder: 'Workout reminder',
    reminderInfo: 'Reminders follow your workout plan', install: 'Install on your phone',
    logout: 'Log out', ko: 'KO, your gym assistant', soon: 'Coming soon', more: 'More settings',
    error: 'Save failed. Try again.' },
});

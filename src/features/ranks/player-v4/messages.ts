import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { back: 'ارجع للتقدم', season: 'الموسم ده', sources: 'النقط الأخيرة جت منين', training: 'تمرين', meals: 'أكل', checks: 'متابعة' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? { back: 'العودة إلى التقدّم', season: 'هذا الموسم', sources: 'مصادر النقاط الأخيرة', training: 'تمرين', meals: 'طعام', checks: 'متابعة' } : undefined; },
  en: { back: 'Back to progress', season: 'This season', sources: 'Recent points by source', training: 'Training', meals: 'Food', checks: 'Check-ins' },
});

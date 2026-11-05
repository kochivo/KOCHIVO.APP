import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'طلبات الكباتن', count: '{n} طلب تحت المراجعة', empty: 'مفيش طلبات كباتن دلوقتي',
    approve: 'وافق', reject: 'ارفض', approveName: 'وافق على طلب {name}', rejectName: 'ارفض طلب {name}',
    confirm: 'تأكيد رفض طلب {name}؟ الحساب هيفضل موجود.', cancel: 'إلغاء',
    failed: 'العملية ما كملتش، جرّب تاني', loadFailed: 'مقدرناش نحمّل طلبات الكباتن',
    retry: 'جرّب تاني', loading: 'بنحمّل طلبات الكباتن…', noEmail: 'مفيش إيميل',
    missingIntake: 'لسه ماملاش البيانات', whatsapp: 'واتساب', instagram: 'إنستجرام',
    current_tool: 'بتستخدم إيه حالياً لمتابعة لاعيبتك؟',
    whatsapp_excel: 'واتساب وإكسيل', other_app: 'تطبيق تاني', just_starting: 'لسه ببتدي',
    main_challenge: 'إيه أكبر تحدي بيواجهك؟', time_on_tables: 'تضييع الوقت في الجداول',
    tracking_progress: 'متابعة تطور اللاعبين', unprofessional_look: 'شكل الشغل مش احترافي',
    players_range: 'عندك كام لاعب؟', '1-10': '1-10', '11-50': '11-50', '50+': '50+',
  },
  en: {
    title: 'Captain requests', count: '{n} pending requests', empty: 'No captain requests',
    approve: 'Approve', reject: 'Reject', approveName: 'Approve {name}', rejectName: 'Reject {name}',
    confirm: 'Reject {name}? Their account will be kept.', cancel: 'Cancel',
    failed: 'Could not save. Try again', loadFailed: 'Could not load captain requests',
    retry: 'Try again', loading: 'Loading captain requests…', noEmail: 'No email',
    missingIntake: "Hasn't filled in the details yet", whatsapp: 'WhatsApp', instagram: 'Instagram',
    current_tool: 'What do you use to follow your players?',
    whatsapp_excel: 'WhatsApp and Excel', other_app: 'Another app', just_starting: 'Just starting',
    main_challenge: "What's your biggest challenge?", time_on_tables: 'Time spent on tables',
    tracking_progress: 'Tracking player progress', unprofessional_look: "Work doesn't look professional",
    players_range: 'How many players do you have?', '1-10': '1-10', '11-50': '11-50', '50+': '50+',
  },
});

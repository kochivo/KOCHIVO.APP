import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  resetFilters: 'امسح عوامل التصفية',
  all: 'الكل', unread: 'غير مقروء ({n})', audio: 'صوت', photos: 'صور',
  'newCount.one': 'محادثة جديدة واحدة', 'newCount.two': 'محادثتان جديدتان', 'newCount.few': '{count} محادثات جديدة',
  'newCount.many': '{count} محادثة جديدة', 'newCount.other': '{count} محادثة جديدة',
  noMatches: 'لا توجد محادثات مطابقة', noPhotos: 'المحادثات تدعم النص والصوت',
  voice: 'رسالة صوتية {duration}', okay: 'حسنًا، سأراجع', rest: 'خذ قسطًا من الراحة اليوم',
} as const;

export const phoneMessages = defineMessages({
  ar: {
    resetFilters: 'امسح الفلاتر',
    all: 'الكل', unread: 'مش مقروء ({n})', audio: 'صوت', photos: 'صور',
    'newCount.one': 'محادثة جديدة واحدة', 'newCount.two': 'محادثتين جداد', 'newCount.few': '{count} محادثات جديدة',
    'newCount.many': '{count} محادثة جديدة', 'newCount.other': '{count} محادثة جديدة',
    noMatches: 'مفيش محادثات مطابقة', noPhotos: 'المحادثات فيها رسايل نص وصوت',
    voice: 'رسالة صوت {duration}', okay: 'تمام، هشوف', rest: 'خد راحة النهارده',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    resetFilters: 'Reset filters',
    all: 'All', unread: 'Unread ({n})', audio: 'Voice', photos: 'Photos',
    'newCount.one': '{count} new conversation', 'newCount.other': '{count} new conversations',
    noMatches: 'No matching conversations', noPhotos: 'Chat supports text and voice messages',
    voice: 'Voice message {duration}', okay: 'Okay, I’ll check', rest: 'Rest today',
  },
});

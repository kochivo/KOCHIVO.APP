import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  all: 'الكل', unread: 'غير مقروء ({n})', audio: 'صوت', photos: 'صور',
  newCount: '{n} جديدة', noMatches: 'لا توجد محادثات مطابقة', noPhotos: 'المحادثات تدعم النص والصوت',
  voice: 'رسالة صوتية {duration}', okay: 'حسنًا، سأراجع', rest: 'خذ قسطًا من الراحة اليوم',
} as const;

export const phoneMessages = defineMessages({
  ar: {
    all: 'الكل', unread: 'مش مقروء ({n})', audio: 'صوت', photos: 'صور',
    newCount: '{n} جداد', noMatches: 'مفيش محادثات مطابقة', noPhotos: 'المحادثات فيها رسايل نص وصوت',
    voice: 'رسالة صوت {duration}', okay: 'تمام، هشوف', rest: 'خد راحة النهارده',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    all: 'All', unread: 'Unread ({n})', audio: 'Voice', photos: 'Photos',
    newCount: '{n} new', noMatches: 'No matching conversations', noPhotos: 'Chat supports text and voice messages',
    voice: 'Voice message {duration}', okay: 'Okay, I’ll check', rest: 'Rest today',
  },
});

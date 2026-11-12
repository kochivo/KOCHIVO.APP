import { defineMessages } from '@/core/i18n/messages';

import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    forms: 'فورمز', title: 'فورمز اللاعب', weekly: 'متابعة أسبوعية · تلقائي', everyWeek: 'كل أسبوع',
    due: 'آخر ميعاد: {date}', reminder: 'فكّره', reminderHint: 'التذكير هيبقى متاح قريب',
    intake: 'بيانات البداية', checkin: 'متابعة أسبوعية', new: 'جديد', reviewed: 'اتراجع',
    first: 'أول بيانات', same: 'زي اللي فات', summary: '{field}: {change}',
    better: 'أحسن', worse: 'محتاج مراجعة', previous: 'قبل كده: {value}', compare: 'مقارنة بـ {date}',
    loading: 'بنحمّل الفورمز', error: 'مش قادرين نحمّل الفورمز. جرّب تاني.', retry: 'جرّب تاني',
    empty: 'لسه مفيش فورمز', choose: 'اختار فورم عشان تشوف إجاباته', noAnswers: 'مفيش إجابات متسجلة',
    training: 'شوف التمارين', reply: 'ردك للاعب', send: 'اتراجع وابعت', sending: 'بنبعت الرد',
    sendFailed: 'الرد متبعتش. رجّعنا الحالة القديمة، جرّب تاني.', sent: 'الرد اتبعت',
    photos: 'الصور', photo: 'صورة متابعة {count}', noPhotos: 'مفيش صور في الفورم ده',
    photosLoading: 'بنحمّل الصور', photosFailed: 'مش قادرين نحمّل الصور',
    bodyFat: 'نسبة الدهون', percent: '{value}٪', separator: ' · ',
  },
  en: {
    forms: 'Forms', title: 'Player forms', weekly: 'Weekly check-in · automatic', everyWeek: 'Every week',
    due: 'Latest due date: {date}', reminder: 'Remind', reminderHint: 'Reminders are coming soon',
    intake: 'Starting details', checkin: 'Weekly check-in', new: 'New', reviewed: 'Reviewed',
    first: 'First answers', same: 'Same as before', summary: '{field}: {change}',
    better: 'Better', worse: 'Needs review', previous: 'Previously: {value}', compare: 'Compared with {date}',
    loading: 'Loading forms', error: 'Could not load forms. Try again.', retry: 'Try again',
    empty: 'No forms yet', choose: 'Select a form to see its answers', noAnswers: 'No answers recorded',
    training: 'View exercises', reply: 'Reply to player', send: 'Review and send', sending: 'Sending reply',
    sendFailed: 'Reply failed. Previous status restored. Try again.', sent: 'Reply sent',
    photos: 'Photos', photo: 'Check-in photo {count}', noPhotos: 'No photos in this form',
    photosLoading: 'Loading photos', photosFailed: 'Could not load photos',
    bodyFat: 'Body fat', percent: '{value}%', separator: ' · ',
  },
});

import { defineMessages } from '@/core/i18n/messages';

// Kept apart so the offline workout bundle only loads these with the video player.
export const videoMessages = defineMessages({
  ar: {
    coach: 'فيديو من الكابتن', back: 'ارجع للمجموعة', open: 'افتح الفيديو',
    offline: 'الفيديو محتاج نت. تقدر تكمّل تمرينك عادي، وكل حاجة بتتحفظ.',
    muted: 'الفيديو شغال من غير صوت. دوس عليه عشان الصوت.', gif: 'الصورة المتحركة',
    valid: 'لينك {label} سليم. هيشتغل جوه KOCHIVO.',
    external: 'اللينك ده هيفتح برا KOCHIVO. يوتيوب وجوجل درايف بيشتغلوا جوه.',
    invalid: 'لينك الفيديو لازم يبدأ بـ https://', mp4: 'لينك mp4', loading: 'الفيديو بيحمّل', notLoading: 'الفيديو مش بيفتح؟',
    youtube: 'يوتيوب', shorts: 'شورتس', drive: 'جوجل درايف', file: 'فيديو', instagram: 'انستجرام', tiktok: 'تيك توك', link: 'لينك',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    coach: 'فيديو من المدرب', back: 'العودة للمجموعة', open: 'افتح الفيديو',
    offline: 'الفيديو يحتاج إلى الإنترنت. يمكنك متابعة تمرينك، وكل شيء يُحفظ.',
    muted: 'الفيديو يعمل دون صوت. اضغط عليه لتشغيل الصوت.', gif: 'الصورة المتحركة',
    valid: 'رابط {label} صالح. سيعمل داخل KOCHIVO.',
    external: 'هذا الرابط سيفتح خارج KOCHIVO. يوتيوب وجوجل درايف يعملان داخله.',
    invalid: 'رابط الفيديو يجب أن يبدأ بـ https://', mp4: 'رابط mp4', loading: 'جارٍ تحميل الفيديو', notLoading: 'الفيديو لا يعمل؟',
    youtube: 'يوتيوب', shorts: 'شورتس', drive: 'جوجل درايف', file: 'فيديو', instagram: 'إنستجرام', tiktok: 'تيك توك', link: 'رابط',
  } as const : undefined; },
  en: {
    coach: 'Video from your coach', back: 'Back to the set', open: 'Open video',
    offline: 'Video needs internet. You can keep training; everything is saved.',
    muted: 'Plays muted. Tap for sound.', gif: 'Animated image',
    valid: 'Valid {label} link. Plays inside KOCHIVO.',
    external: 'This link opens outside KOCHIVO. YouTube and Google Drive play inside.',
    invalid: 'Video link must start with https://', mp4: 'mp4 link', loading: 'Loading video', notLoading: 'Video not loading?',
    youtube: 'YouTube', shorts: 'Shorts', drive: 'Google Drive', file: 'Video', instagram: 'Instagram', tiktok: 'TikTok', link: 'Link',
  },
});

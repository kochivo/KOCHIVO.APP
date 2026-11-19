import { defineMessages } from '@/core/i18n/messages';

export const conversationMessages = defineMessages({
  ar: {
    today: 'النهارده', yesterday: 'امبارح',
    title: 'صندوق الوارد', profile: 'الملف', back: 'رجوع', voice: 'رسالة صوتية · {duration}', own: 'انت: {text}',
    remainingToday: 'بينتهي النهارده', 'remaining.one': "ينتهي بكرة", 'remaining.two': "باقي يومين", 'remaining.few': "باقي {n} أيام", 'remaining.many': "باقي {n} يوم", 'remaining.other': "باقي {n} يوم", empty: 'مفيش محادثات لسه', emptyThread: 'مفيش رسائل لسه',
    choose: 'اختار محادثة', loading: 'بنحمّل المحادثات…', error: 'مش قادرين نحمّل المحادثات', retry: 'جرّب تاني',
    placeholder: 'اكتب رسالة…', send: 'ابعت', record: 'سجّل رسالة صوتية', stop: 'وقف التسجيل', discard: 'امسح التسجيل',
    recording: 'بنسجّل…', sending: 'بنبعت…', failed: 'الرسالة متبعتتش. جرّب تاني', play: 'شغّل الرسالة الصوتية', pause: 'وقف التشغيل',
    playFailed: 'مش قادرين نشغّل التسجيل', micFailed: 'مش قادرين نفتح الميكروفون',
    quick: 'ردود سريعة', light: '3×10 بوزن خفيف', video: 'ابعتلي فيديو', okay: 'تمام كده',
    unsent: 'فيه تسجيل لسه متبعتش. تخرج وتمسحه؟', conversations: 'المحادثات', thread: 'الرسائل', 'unread.one': "رسالة واحدة مش مقروءة", 'unread.two': "رسالتين مش مقروءين", 'unread.few': "{n} رسايل مش مقروءة", 'unread.many': "{n} رسالة مش مقروءة", 'unread.other': "{n} رسالة مش مقروءة",
  },
  arStd: {
    today: 'اليوم', yesterday: 'أمس',
    title: 'صندوق الوارد', profile: 'الملف', back: 'رجوع', voice: 'رسالة صوتية · {duration}', own: 'أنت: {text}',
    remainingToday: 'ينتهي اليوم', 'remaining.one': "ينتهي غدًا", 'remaining.two': "متبقي يومين", 'remaining.few': "متبقي {n} أيام", 'remaining.many': "متبقي {n} يومًا", 'remaining.other': "متبقي {n} يوم", empty: 'لا توجد محادثات بعد', emptyThread: 'لا توجد رسائل بعد',
    choose: 'اختر محادثة', loading: 'جارٍ تحميل المحادثات…', error: 'تعذّر تحميل المحادثات', retry: 'حاول مجددًا',
    placeholder: 'اكتب رسالة…', send: 'أرسل', record: 'سجّل رسالة صوتية', stop: 'أوقف التسجيل', discard: 'احذف التسجيل',
    recording: 'جارٍ التسجيل…', sending: 'جارٍ الإرسال…', failed: 'لم تُرسل الرسالة. حاول مجددًا', play: 'شغّل الرسالة الصوتية', pause: 'أوقف التشغيل',
    playFailed: 'تعذّر تشغيل التسجيل', micFailed: 'تعذّر فتح الميكروفون',
    quick: 'ردود سريعة', light: '3×10 بوزن خفيف', video: 'أرسل لي فيديو', okay: 'جيد هكذا',
    unsent: 'لديك تسجيل لم يُرسل. هل تريد الخروج وحذفه؟', conversations: 'المحادثات', thread: 'الرسائل', 'unread.one': "رسالة واحدة غير مقروءة", 'unread.two': "رسالتان غير مقروءتين", 'unread.few': "{n} رسائل غير مقروءة", 'unread.many': "{n} رسالة غير مقروءة", 'unread.other': "{n} رسالة غير مقروءة",
  },
  en: {
    today: 'Today', yesterday: 'Yesterday',
    title: 'Inbox', profile: 'Profile', back: 'Back', voice: 'Voice note · {duration}', own: 'You: {text}',
    remainingToday: 'Ends today', 'remaining.one': "Ends tomorrow", 'remaining.other': "{n} days left", empty: 'No conversations yet', emptyThread: 'No messages yet',
    choose: 'Choose a conversation', loading: 'Loading conversations…', error: 'Could not load conversations', retry: 'Try again',
    placeholder: 'Write a message…', send: 'Send', record: 'Record a voice message', stop: 'Stop recording', discard: 'Discard recording',
    recording: 'Recording…', sending: 'Sending…', failed: 'Message not sent. Try again', play: 'Play voice message', pause: 'Pause',
    playFailed: 'Could not play recording', micFailed: 'Could not open microphone',
    quick: 'Quick replies', light: '3×10 with a light weight', video: 'Send me a video', okay: 'Looks good',
    unsent: 'You have an unsent recording. Leave and discard it?', conversations: 'Conversations', thread: 'Messages', 'unread.one': "{n} unread message", 'unread.other': "{n} unread messages",
  },
});

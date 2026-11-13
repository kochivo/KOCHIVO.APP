import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/thread-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { thread: 'الرسايل', today: 'النهارده', yesterday: 'امبارح', play: 'شغّل الرسالة الصوتية',
    pause: 'وقّف الرسالة الصوتية', empty: 'مفيش رسايل من الكابتن لسه',
    repliesFailed: 'مش قادرين نحمّل ردود الكابتن' },
  en: { thread: 'Messages', today: 'Today', yesterday: 'Yesterday', play: 'Play voice note',
    pause: 'Pause voice note', empty: 'No messages from your coach yet',
    repliesFailed: 'Could not load coach replies' },
});

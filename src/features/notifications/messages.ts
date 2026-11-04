import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    sessions_used_up: 'حصص اللاعب خلصت. راجع الاشتراك',
    workout_feedback: 'فيه تقييم تمرين جديد محتاج تشوفه',
    workout_reminder: 'جاهز لتمرين النهارده؟ {name} مستنيك',
    join_requested: '{name} بعت طلب انضمام',
    title: 'الإشعارات', close: 'اقفل الإشعارات', markAll: 'علّم الكل كمقروء',
    loading: 'بنحمّل الإشعارات…', empty: 'لسه مفيش إشعارات',
    error: 'مش قادرين نحمّل الإشعارات، جرّب تاني', retry: 'جرّب تاني',
    saveError: 'مقدرناش نعلّم الإشعار كمقروء، جرّب تاني',
    plan_assigned: 'اتعيّنلك برنامج {name}', nutrition_updated: 'اتحدّث نظامك الغذائي {name}',
    player_joined: '{name} انضم ليك', player_inactive: '{name} متمرّنش بقاله 3 أيام أو أكتر',
    now: 'دلوقتي', minutes: 'من {n} دقيقة', hours: 'من {n} ساعة', days: 'من {n} يوم',
  },
  en: {
    sessions_used_up: 'Player sessions used up. Review the subscription',
    workout_feedback: 'New workout feedback needs your attention',
    workout_reminder: 'Ready for today’s workout? {name} is waiting',
    join_requested: '{name} requested to join',
    title: 'Notifications', close: 'Close notifications', markAll: 'Mark all as read',
    loading: 'Loading notifications…', empty: 'No notifications yet',
    error: 'Could not load notifications. Try again', retry: 'Try again',
    saveError: 'Could not mark as read. Try again',
    plan_assigned: 'Program assigned: {name}', nutrition_updated: 'Nutrition updated: {name}',
    player_joined: '{name} joined you', player_inactive: '{name} has not trained for 3 or more days',
    now: 'Just now', minutes: '{n} minutes ago', hours: '{n} hours ago', days: '{n} days ago',
  },
});

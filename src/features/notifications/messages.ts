import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'الإشعارات', close: 'اقفل الإشعارات', markAll: 'علّم الكل كمقروء',
    loading: 'بنحمّل الإشعارات…', empty: 'لسه مفيش إشعارات',
    error: 'مش قادرين نحمّل الإشعارات، جرّب تاني', retry: 'جرّب تاني',
    saveError: 'مقدرناش نعلّم الإشعار كمقروء، جرّب تاني',
    plan_assigned: 'اتعيّنلك برنامج {name}', nutrition_updated: 'اتحدّث نظامك الغذائي {name}',
    player_joined: '{name} انضم ليك', player_inactive: '{name} متمرّنش بقاله 3 أيام أو أكتر',
    now: 'دلوقتي', minutes: 'من {n} دقيقة', hours: 'من {n} ساعة', days: 'من {n} يوم',
  },
  en: {
    title: 'Notifications', close: 'Close notifications', markAll: 'Mark all as read',
    loading: 'Loading notifications…', empty: 'No notifications yet',
    error: 'Could not load notifications. Try again', retry: 'Try again',
    saveError: 'Could not mark as read. Try again',
    plan_assigned: 'Program assigned: {name}', nutrition_updated: 'Nutrition updated: {name}',
    player_joined: '{name} joined you', player_inactive: '{name} has not trained for 3 or more days',
    now: 'Just now', minutes: '{n} minutes ago', hours: '{n} hours ago', days: '{n} days ago',
  },
});

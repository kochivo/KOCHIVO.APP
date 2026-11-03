import type { InboxItem } from './types';

export function mergeInbox(forms: Extract<InboxItem, { kind: 'form' }>[], checkIns: Extract<InboxItem, { kind: 'checkin' }>[]): InboxItem[] {
  return [...forms, ...checkIns].sort((a, b) =>
    Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
}
export function ageLabel(createdAt: string, now: Date): string {
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(createdAt)) / 3600000));
  if (hours < 1) return 'دلوقتي';
  if (hours < 24) return `من ${hours} ${hours <= 10 ? 'ساعات' : 'ساعة'}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'إمبارح';
  return `من ${days} ${days <= 10 ? 'أيام' : 'يوم'}`;
}
export function quickReplies(kind: InboxItem['kind']): string[] {
  return kind === 'form'
    ? ['الفورم ممتاز', 'ضهرك مفرود أكتر', 'نزّل الوزن شوية']
    : ['تقدم ممتاز كمّل', 'ركّز على الأكل الأسبوع ده', 'كلمني نظبط البرنامج'];
}

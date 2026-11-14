import type { Translator } from '@/core/i18n/messages';
import type { CaptainTask } from './tasks-model';
import type { taskMessages } from './messages';
export function taskText(task: CaptainTask, t: Translator<typeof taskMessages>) {
  if (task.kind === 'absent') return t(task.neverTrained ? 'neverTrained' : 'absentText', { days: task.days ?? 0 });
  if (task.kind === 'renew') return t('renewText', { days: task.days ?? 0 });
  if (task.kind === 'program') return t('programText');
  if (task.kind === 'receipt') return t('receiptText');
  if (task.swap) return t('swapText', { from: task.swap.from, to: task.swap.to });
  return task.text || t('checkinText');
}
export const taskTag = (kind: CaptainTask['kind']) => kind === 'video' ? 'videoTag' : kind === 'checkin' ? 'checkinTag' : kind === 'swap' ? 'swapTag' : kind;

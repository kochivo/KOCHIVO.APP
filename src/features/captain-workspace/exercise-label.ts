import type { MessageKey, Translator } from '@/core/i18n/messages';
import type { messages } from './messages';

const labels: Record<string, MessageKey<typeof messages>> = {
  chest: 'chest', back: 'back', 'upper legs': 'thighs', 'lower legs': 'calves', shoulders: 'shoulders',
  'upper arms': 'arms', 'lower arms': 'forearms', waist: 'abs', core: 'abs', glutes: 'glutes', cardio: 'cardio', neck: 'neck',
  barbell: 'barbell', dumbbell: 'dumbbell', cable: 'cable', 'body weight': 'bodyWeight',
  'leverage machine': 'machine', 'smith machine': 'smith', 'ez barbell': 'ezBar',
  band: 'band', 'resistance band': 'band', kettlebell: 'kettlebell', 'stability ball': 'ball',
  'bosu ball': 'ball', 'medicine ball': 'ball', roller: 'roller', rope: 'rope', weighted: 'weighted', assisted: 'assisted',
};

export function exerciseLabel(value: string | null | undefined, t: Translator<typeof messages>): string {
  const key = value ? labels[value.toLowerCase()] : undefined;
  return key ? t(key) : value || t('unavailable');
}

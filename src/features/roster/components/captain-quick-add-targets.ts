export const quickAddTargets = {
  '/captain/billing': 'button.control-primary',
  '/captain/templates': 'button.control-primary',
  '/captain/library/meal-plans': '#meal-library-create',
} as const;

export type QuickAddTarget = keyof typeof quickAddTargets;

export function isQuickAddTarget(path: string): path is QuickAddTarget {
  return Object.hasOwn(quickAddTargets, path);
}

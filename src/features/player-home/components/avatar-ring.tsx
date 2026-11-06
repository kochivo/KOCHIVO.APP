import { StreakRing } from './streak-ring';

export function AvatarRing({ initial, done, planned }: { initial: string; done: number; planned: number }) {
  return <div aria-hidden="true" className="relative grid size-12 shrink-0 place-items-center">
    <span className="absolute grid size-10 place-items-center rounded-full bg-surface-raised text-sm font-medium">{initial}</span>
    <StreakRing done={done} planned={planned} size={48} animate />
  </div>;
}

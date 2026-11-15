import { KoPlayers } from '@/ui/icons/ko-players';
import { KoTraining } from '@/ui/icons/ko-training';
import styles from './welcome.module.css';

export function WelcomeRoleCard({ player = false, selected, title, description, onClick, onSelect }: {
  player?: boolean; selected: boolean; title: string; description: string; onClick: () => void;
  onSelect: (role: 'player' | 'captain') => void;
}) {
  const Icon = player ? KoTraining : KoPlayers;
  return <button type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={onClick}
    className={styles.role} onKeyDown={event => {
      let next: 'player' | 'captain';
      if (event.key === 'Home') next = 'player';
      else if (event.key === 'End') next = 'captain';
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) next = player ? 'captain' : 'player';
      else return;
      event.preventDefault(); onSelect(next);
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]').item(next === 'player' ? 0 : 1)?.focus();
    }}>
    <span className={styles.tile}><Icon className="size-6" aria-hidden="true" /></span>
    <span className="flex-1 space-y-inline"><span className="block text-lg font-bold">{title}</span><span className="block text-sm text-muted">{description}</span></span>
  </button>;
}

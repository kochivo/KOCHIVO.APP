import { Banknote, Bell, ClipboardList, Play, Trophy, UserPlus } from 'lucide-react';
import type { NotificationType } from '../types';

export function captainNotification(kind: NotificationType) {
  if (kind === 'workout_feedback') return { Icon: Play, href: '/captain/tasks' };
  if (kind === 'form_requested') return { Icon: ClipboardList, href: '/captain/tasks' };
  if (kind === 'renewal_requested' || kind === 'subscription_expiring'
    || kind === 'subscription_expired' || kind === 'sessions_used_up') {
    return { Icon: Banknote, href: '/captain/billing' };
  }
  if (kind === 'join_requested' || kind === 'player_joined') return { Icon: UserPlus, href: '/captain/join' };
  if (kind === 'rank_up' || kind === 'player_rank_up' || kind.startsWith('crown_')) return { Icon: Trophy, href: '/captain/leaderboard' };
  return { Icon: Bell, href: kind === 'chat_message' ? '/captain/inbox' : '/captain/players' };
}

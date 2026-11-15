export interface RosterPlayer {
  chat?: { unread: number; body?: string | null; voice?: boolean; createdAt?: string };
  tier?: { name: string; color: string; is_featured?: boolean } | null;
  timezone?: string;
  playerToday?: string;
  linkId?: string;
  pending?: boolean;
  frozenAt?: string | null;
  awaitingPlansAt?: string | null;
  sessionsLeft?: number | null;
  playerId: string;
  fullName: string;
  avatarUrl?: string | null;
  accessUntil: string;
  startedOn: string;
  lastTrainingDate: string | null;
  programTitle: string | null;
  openTasks: number;
}

export type RosterResult = { players: RosterPlayer[]; error?: never } | { error: string; players?: never };

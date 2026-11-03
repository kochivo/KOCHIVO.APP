export interface RosterPlayer {
  playerId: string;
  fullName: string;
  accessUntil: string;
  startedOn: string;
  lastTrainingDate: string | null;
  programTitle: string | null;
  openTasks: number;
}

export type RosterResult = { players: RosterPlayer[]; error?: never } | { error: string; players?: never };

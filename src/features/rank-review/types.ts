export type PendingWorkout = {
  id: string;
  player_id: string;
  player_name: string | null;
  training_date: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type Tier = 'beginner' | 'champion' | 'elite' | 'legend';

export type LeaderboardRow = {
  player_id: string | null;
  display_name: string;
  lifetime: number;
  tier: Tier;
  monthly: number;
  adherence: number;
  done: number;
  planned: number;
  is_crown: boolean;
  position: number;
};

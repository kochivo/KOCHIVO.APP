type Table<Row, Insert = Row> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };
type Settings = {
  player_id: string; enabled: boolean; asked_at: string | null;
  avg_cycle_days: number; avg_period_days: number; light_days: number;
  photos_captain: boolean; photos_share: boolean;
};
export type WomenModeTables = {
  cycle_settings: Table<Settings, Pick<Settings, 'player_id'> & Partial<Settings>>;
  cycle_logs: Table<{ player_id: string; start_date: string }>;
  cycle_overrides: Table<{ player_id: string; day: string }>;
};
export type WomenModeFunctions = {
  player_light_day: { Args: { p_player: string; p_date: string }; Returns: boolean };
};

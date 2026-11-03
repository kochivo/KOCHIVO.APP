// Kept apart from alerts.ts so the client search box never pulls in the roster's server code.
/** Matches the name or the program, ignoring case, Arabic letter forms and extra spaces. */
export function matchesPlayer(player: { fullName: string; programTitle: string | null }, query: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();
  const needle = normalize(query);
  return needle === '' || normalize(`${player.fullName} ${player.programTitle ?? ''}`).includes(needle);
}

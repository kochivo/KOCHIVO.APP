export function captainWorkspaceEnabled(flag: string | undefined = process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE): boolean {
  return flag === '1';
}

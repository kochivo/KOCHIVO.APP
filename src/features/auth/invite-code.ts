export function parseInviteCode(input: string): string | null {
  // 0003 generates case-sensitive base64url codes; dashes are significant.
  const code = input.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(code) ? code : null;
}

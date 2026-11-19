const approvalLifetime = 600_000;

export function createApproval(token: string, receivedAt: number) {
  let available = true;
  const expiresAt = receivedAt + approvalLifetime;
  return {
    expiresAt,
    expired: (now: number) => now >= expiresAt,
    take(now: number): string | null {
      if (!available || now >= expiresAt) return null;
      available = false;
      return token;
    },
  };
}


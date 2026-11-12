// Kept apart from schema.ts so the delete card does not pull Zod into the client bundle.
export function deletionDate(requestedAt: string): string {
  return new Date(Date.parse(requestedAt) + 7 * 86_400_000).toISOString();
}

export function deletionRequestedAt(due: string): string {
  return new Date(Date.parse(due) - 7 * 86_400_000).toISOString();
}

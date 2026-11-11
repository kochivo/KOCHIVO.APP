export type CoachRequestStatus = 'sent' | 'member' | 'linked';

export const coachRequestValues = { sent: '1', member: 'member', linked: 'linked' } as const satisfies Record<CoachRequestStatus, string>;

export function parseCoachRequestStatus(value: unknown): CoachRequestStatus | undefined {
  return (Object.keys(coachRequestValues) as CoachRequestStatus[]).find(status => coachRequestValues[status] === value);
}

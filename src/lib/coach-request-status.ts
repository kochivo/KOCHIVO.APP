export type CoachRequestStatus = 'sent' | 'member' | 'linked' | 'waitlisted';

export const coachRequestValues = { sent: '1', member: 'member', linked: 'linked', waitlisted: 'waitlist' } as const satisfies Record<CoachRequestStatus, string>;

export function parseCoachRequestStatus(value: unknown): CoachRequestStatus | undefined {
  return (Object.keys(coachRequestValues) as CoachRequestStatus[]).find(status => coachRequestValues[status] === value);
}

import type { Messages } from "./i18n";
export function coachInviteMessage(code: string, t: Messages) {
  const errors: Record<string, string> = {
    invalid_capacity: t.flexInvalid,
    capacity_below_roster: t.flexRoster,
    quote_changed: t.flexChanged,
    quote_expired: t.flexExpired,
    request_unavailable: t.flexUnavailable,
    phone_taken: t.ciPhoneTaken,
    invalid_phone: t.ciInvalidPhone,
    invite_expired: t.ciExpired,
    email_unconfirmed: t.ciUnconfirmed,
    coach_invites_setup_required: t.ciSetup,
    plan_unavailable: t.ciPlanUnavailable,
    coach_account_required: t.ciRole,
    trial_already_used: t.ciExistingCoach,
    coach_already_active: t.ciExistingCoach,
    too_many_requests: t.authRateLimited,
  };
  return errors[code] ?? t.ciFailed;
}

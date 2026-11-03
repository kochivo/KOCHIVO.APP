type AuthMessages = {
  authDeliveryError: string;
  authRateLimited: string;
  authInvalidCredentials: string;
  emailNotConfirmed: string;
  authFailed: string;
  authAlreadyRegistered: string;
  authInvalidEmail: string;
};
// Supabase can mask a duplicate confirmed signup with an empty identities list.
// Do not query the user directory or attempt a login to discover accounts.
export function isExistingSignup(data: {
  session?: unknown;
  user?: { identities?: unknown[] } | null;
}) {
  return (
    !data.session &&
    Array.isArray(data.user?.identities) &&
    data.user.identities.length === 0
  );
}
export function authErrorMessage(error: unknown, messages: AuthMessages) {
  const value =
    error && typeof error === "object"
      ? (error as { code?: string; message?: string; status?: number })
      : {};
  if (value.code === "email_not_confirmed") return messages.emailNotConfirmed;
  if (value.code === "user_already_exists" || value.code === "email_exists")
    return messages.authAlreadyRegistered;
  if (value.code === "invalid_credentials")
    return messages.authInvalidCredentials;
  if (value.code === "email_address_invalid") return messages.authInvalidEmail;
  if (
    ["weak_password", "validation_failed", "email_address_invalid"].includes(
      value.code ?? "",
    )
  )
    return messages.authFailed;
  if (
    value.status === 429 ||
    value.code === "over_email_send_rate_limit" ||
    value.code === "over_request_rate_limit"
  )
    return messages.authRateLimited;
  if (
    /error sending.*email|unauthorized ip address|smtp/i.test(
      value.message || "",
    )
  )
    return messages.authDeliveryError;
  return messages.authFailed;
}

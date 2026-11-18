export function consentPath(id: string) {
  return `/oauth/consent?${new URLSearchParams({ authorization_id: id })}`;
}

export function oauthRedirectUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {
    return null;
  }
  return null;
}

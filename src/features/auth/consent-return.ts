export function consentReturnPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/oauth/consent?') || /[\\#\r\n]/.test(value)) return undefined;
  const params = new URLSearchParams(value.slice('/oauth/consent?'.length));
  const id = params.get('authorization_id');
  if (params.size === 1 && id) return `/oauth/consent?${new URLSearchParams({ authorization_id: id })}`;
}

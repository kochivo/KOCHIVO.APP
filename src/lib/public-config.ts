// These values ship to every browser, so they are not secrets. Defaults live here so the app
// works without editing env files; a deployment can still override each one through its env var.
export const publicConfig = {
  ownerWhatsapp: process.env.NEXT_PUBLIC_OWNER_WHATSAPP?.trim() || '201100539306',
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || '',
} as const;

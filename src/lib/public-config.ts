// These values ship to every browser, so they are not secrets. Defaults live here so the app
// works without editing env files; a deployment can still override each one through its env var.
export const publicConfig = {
  ownerWhatsapp: process.env.NEXT_PUBLIC_OWNER_WHATSAPP?.trim() || '201100539306',
  // Only production builds report by default, so local development and tests never send events.
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || (process.env.NODE_ENV === 'production'
    ? 'https://95b08b4a94291b2897f3f4c73260ec0d@o4512366493171712.ingest.de.sentry.io/4512366520107088' : ''),
} as const;

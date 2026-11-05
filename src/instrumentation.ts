import * as Sentry from '@sentry/nextjs';
import { publicConfig } from '@/lib/public-config';

export async function register() {
  if (!publicConfig.sentryDsn) return;
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('../sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('../sentry.edge.config');
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (publicConfig.sentryDsn) Sentry.captureRequestError(...args);
};

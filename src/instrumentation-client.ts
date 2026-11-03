import * as Sentry from '@sentry/nextjs';
import { beforeBreadcrumb, beforeSend } from '@/lib/sentry-scrub';
import { publicConfig } from '@/lib/public-config';

const dsn = publicConfig.sentryDsn;
if (dsn) {
  Sentry.init({
    dsn,
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
      urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0,
    },
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend,
    beforeBreadcrumb,
  });
}

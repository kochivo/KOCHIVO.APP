import * as Sentry from '@sentry/nextjs';
import { beforeBreadcrumb, beforeSend } from './src/lib/sentry-scrub';
import { publicConfig } from './src/lib/public-config';

const dsn = publicConfig.sentryDsn;
if (dsn) {
  Sentry.init({
    dsn,
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
      urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0,
    },
    tracesSampleRate: 0,
    beforeSend,
    beforeBreadcrumb,
  });
}

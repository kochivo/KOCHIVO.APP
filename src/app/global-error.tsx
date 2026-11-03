'use client';

import { useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import './globals.css';
import { publicConfig } from '@/lib/public-config';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (publicConfig.sentryDsn) captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="flex min-h-dvh items-center justify-center p-6 text-start">
          <section className="glass-strong w-full max-w-md rounded-card p-6">
            <h1 className="text-2xl font-bold text-ink">حصلت مشكلة</h1>
            <p className="mt-3 text-muted">جرّب تاني عشان نكمّل.</p>
            <button type="button" onClick={reset}
              className="mt-6 min-h-12 w-full rounded-control bg-lime px-6 font-bold text-on-lime">
              جرّب تاني
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

'use client';

import { CaptainNotificationsStateEntry } from '@/features/notifications';

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <CaptainNotificationsStateEntry kind="error" retry={retry} />;
}

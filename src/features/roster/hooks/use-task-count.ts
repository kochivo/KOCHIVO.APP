'use client';
import { useEffect, useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { subscribeTaskCount } from './task-count-subscription';

export function useTaskCount(pathname: string, locale: Locale, fetcher: typeof fetch = fetch) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const subscription = subscribeTaskCount(`/${locale}/api/captain/task-count`, setCount, fetcher, window, document);
    void subscription.refresh();
    return subscription.dispose;
  }, [pathname, locale, fetcher]);
  return count;
}

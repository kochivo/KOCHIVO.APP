'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/ui/button';

export function ProfileRetry({ label }: { label: string }) {
  const router = useRouter();
  return <Button variant="secondary" onClick={() => router.refresh()}>{label}</Button>;
}

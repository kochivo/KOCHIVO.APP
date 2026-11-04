'use client';

import { CalendarCheck, ClipboardList, Scale } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/ui/empty-state';
import { focusRecorder } from '../recorder-focus';

export function RemindButton({ playerId, kind, title, body, label }: {
  playerId: string; kind: 'checkins' | 'intake' | 'progress'; title: string; body: string; label: string;
}) {
  const router = useRouter();
  return <EmptyState icon={{ checkins: CalendarCheck, intake: ClipboardList, progress: Scale }[kind]} title={title} body={body}
    action={{ label, onClick: () => {
      if (!focusRecorder(playerId)) router.push(`/captain/players/${playerId}?tab=checkins#voice-recorder-${playerId}`, { scroll: false });
    } }} />;
}

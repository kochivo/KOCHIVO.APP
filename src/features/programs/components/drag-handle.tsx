'use client';

import { GripVertical } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { IconButton } from '@/ui';
import { messages } from '../messages';
import type { DragHandleProps } from '../hooks/use-drag-reorder';

export function DragHandle({ name, position, onMove, dragProps }: {
  name: string; position: string; onMove: (delta: -1 | 1) => void; dragProps?: DragHandleProps;
}) {
  const t = useT(messages);
  return <IconButton {...dragProps} type="button" aria-label={t('dragReorder', { name, position })}
    className="min-h-12 min-w-12 shrink-0 touch-none cursor-grab active:cursor-grabbing"
    onKeyDown={event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        onMove(event.key === 'ArrowUp' ? -1 : 1);
      }
    }}><GripVertical aria-hidden className="size-5" strokeWidth={1.5} /></IconButton>;
}

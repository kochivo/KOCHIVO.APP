'use client';

import { useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useToast } from '@/ui/toast';
import { assignTemplate } from '../data/templates';
import { messages } from '../messages';
import type { Template } from '../types';

export function useTemplateAssignment(template: Template, playerIds: string[], onClose: () => void) {
  const t = useT(messages);
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const available = playerIds.filter(id => !done.includes(id));
  function toggle(id: string) {
    if (lock.current || done.includes(id)) return;
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  function selectAll() {
    if (lock.current) return;
    setSelected(available.every(id => selected.includes(id)) ? [] : available);
  }
  async function assign(ids = selected) {
    if (lock.current || ids.length === 0) return;
    lock.current = true; setBusy(true);
    const succeeded = [...done];
    const failed: Record<string, string> = {};
    for (const playerId of ids.filter(id => !done.includes(id))) {
      try {
        const result = await assignTemplate({ kind: template.kind, templateId: template.id, playerId });
        if (result.error !== undefined) failed[playerId] = result.error;
        else {
          succeeded.push(playerId);
          setDone([...succeeded]);
        }
      } catch { failed[playerId] = t('couldntAssignTemplateTryAgain'); }
    }
    const remaining = { ...Object.fromEntries(Object.entries(failures).filter(([id]) => !ids.includes(id))), ...failed };
    setFailures(remaining);
    setSelected(current => [...new Set([...current.filter(id => !succeeded.includes(id)), ...Object.keys(failed)])]);
    setBusy(false); lock.current = false;
    if (Object.keys(remaining).length === 0) {
      toast.success(t('assignedMany', { n: succeeded.length }));
      onClose();
    }
  }
  return { selected, done, failures, busy, toggle, selectAll, assign, retry: () => assign(Object.keys(failures)),
    allSelected: available.length > 0 && available.every(id => selected.includes(id)) };
}

'use client';

import { useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { makeIntakeSchema } from '../data/intake-schema';
import type { IntakeDraft } from '../wizard';

const key = 'kochivo:intake-draft';
const defaults: IntakeDraft = {
  birth_year: 1998, height_cm: 170, weight_kg: 75, target_weight_kg: null,
  training_days: [], injuries: [], medical: [], allergies: [], notes: '',
};
const subscribe = () => () => {};

export function readIntakeDraft(now: Date): IntakeDraft {
  try {
    if (typeof window === 'undefined') return { ...defaults };
    try { window.localStorage.removeItem(key); } catch { /* Legacy storage may be unavailable. */ }
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...defaults };
    // Keep unfinished measurements so reloading cannot silently replace an answer that needs fixing.
    const fields = makeIntakeSchema(now).intakeSchema.extend({
      birth_year: z.number(), height_cm: z.number(), weight_kg: z.number(),
      target_weight_kg: z.number().nullable(), notes: z.string().nullable(),
      training_days: z.array(z.number()),
    }).partial().safeParse(raw);
    return fields.success ? { ...defaults, ...fields.data } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function useIntakeDraft() {
  const [draft, setDraft] = useState<IntakeDraft>(() => readIntakeDraft(new Date()));
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  function update(patch: IntakeDraft) {
    const next = { ...draft, ...patch };
    setDraft(next);
    try { window.sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  }
  function clear() {
    try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  }
  return { draft, update, clear, ready };
}

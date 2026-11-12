import { z } from 'zod';
export type PackageSelection = { package?: string; offer?: string };
export function packageSelection(input: unknown): PackageSelection {
  if (!input || typeof input !== 'object') return {};
  const uuid = (value: unknown) => z.uuid().safeParse(value).success ? String(value) : undefined;
  const pkg = uuid('package' in input ? input.package : undefined);
  const offer = uuid('offer' in input ? input.offer : undefined);
  return { ...(pkg ? { package: pkg } : {}), ...(pkg && offer ? { offer } : {}) };
}
export function selectionQuery(input: unknown) {
  const selection = packageSelection(input);
  return Object.entries(selection).map(([key, value]) => `&${key}=${encodeURIComponent(value)}`).join('');
}
export function browserSelection() {
  if (typeof window === 'undefined') return {};
  return packageSelection(Object.fromEntries(new URLSearchParams(window.location.search)));
}

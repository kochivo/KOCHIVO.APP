const storageKey = (listKey: string) => `kochivo:shopping-checks:${listKey}`;

export function readShoppingChecks(listKey?: string): Set<string> {
  if (!listKey) return new Set();
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(listKey)) ?? 'null');
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function writeShoppingChecks(listKey: string | undefined, checked: ReadonlySet<string>) {
  if (!listKey) return;
  try {
    if (checked.size) localStorage.setItem(storageKey(listKey), JSON.stringify([...checked]));
    else localStorage.removeItem(storageKey(listKey));
  } catch {
    // The current checklist still works if browser storage is unavailable.
  }
}

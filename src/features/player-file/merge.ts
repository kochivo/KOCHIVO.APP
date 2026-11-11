import type { FactKey, FactValues, FormHistoryEntry, PlayerFact, PlayerFacts, Snapshot } from './model';

function chronological(snapshots: readonly Snapshot[]): Snapshot[] {
  return [...snapshots].sort((a, b) => Date.parse(a.source.at) - Date.parse(b.source.at)
    || a.source.kind.localeCompare(b.source.kind) || a.source.id.localeCompare(b.source.id));
}

function equal(a: FactValues[FactKey] | undefined, b: FactValues[FactKey]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  const left = new Set<string | number>(a);
  const right = new Set<string | number>(b);
  return left.size === right.size && [...left].every(value => right.has(value));
}

export function mergePlayerFile(snapshots: readonly Snapshot[], now: Date, lastViewedAt?: string): PlayerFacts {
  const ordered = chronological(snapshots).reverse();
  const newest = ordered[0];
  const result: PlayerFacts = {};
  function mergeKey<K extends FactKey>(key: K) {
    const current = ordered.find(snapshot => snapshot.facts[key] !== undefined);
    if (!current) return;
    const value = current.facts[key];
    if (value === undefined) return;
    const older = ordered.find(snapshot => Date.parse(snapshot.source.at) < Date.parse(current.source.at)
      && snapshot.facts[key] !== undefined && !equal(snapshot.facts[key], value));
    const previous = older?.facts[key];
    const at = Date.parse(current.source.at);
    const fact: PlayerFact<K> = {
      key, value, source: current.source,
      isNew: current === newest && at <= now.getTime()
        && (lastViewedAt === undefined || at > Date.parse(lastViewedAt)),
      ...(older && previous !== undefined ? { previous: { value: previous, source: older.source } } : {}),
    };
    Object.assign(result, { [key]: fact });
  }
  const keys = new Set(ordered.flatMap(snapshot => Object.keys(snapshot.facts) as FactKey[]));
  keys.forEach(mergeKey);
  return result;
}

export function formHistory(snapshots: readonly Snapshot[]): FormHistoryEntry[] {
  const state: Partial<FactValues> = {};
  return chronological(snapshots).map((snapshot, index) => {
    const keys = Object.keys(snapshot.facts) as FactKey[];
    const changed = keys.filter(key => {
      const value = snapshot.facts[key];
      return value !== undefined && !equal(state[key], value);
    });
    for (const key of keys) {
      const value = snapshot.facts[key];
      if (value !== undefined) Object.assign(state, { [key]: value });
    }
    return { source: snapshot.source, changed: index === 0 ? [] : changed, first: index === 0 };
  }).reverse();
}

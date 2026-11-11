import { timezoneSyncTarget } from '@/lib/timezone';

type Profile = { id: string; timezone: string; timezone_auto: boolean };
export function createTimezoneSync(write: (id: string, timezone: string) => Promise<void>) {
  const persisted = new Map<string, string>();
  const pending = new Map<string, Promise<void>>();
  let chain = Promise.resolve();
  let generation = 0;
  return {
    reset: () => { generation++; persisted.clear(); pending.clear(); },
    run(profile: Profile, device: string): Promise<void> {
      const target = timezoneSyncTarget(profile.timezone_auto, persisted.get(profile.id) ?? profile.timezone, device);
      const key = `${profile.id}:${target}`;
      if (!target) return Promise.resolve();
      const existing = pending.get(key);
      if (existing) return existing;
      const version = generation;
      const work = chain.then(async () => {
        if (version !== generation) return;
        await write(profile.id, target);
        if (version === generation) persisted.set(profile.id, target);
      });
      chain = work.catch(() => undefined);
      const result = work.finally(() => { if (pending.get(key) === result) pending.delete(key); });
      pending.set(key, result);
      return result;
    },
  };
}

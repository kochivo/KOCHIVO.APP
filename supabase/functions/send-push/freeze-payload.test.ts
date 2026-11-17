import { expect, it } from 'vitest';
import { pushPayload } from './payload';

it.each(['ar', 'en'] as const)('links freeze push notifications to the right subscription view in %s', locale => {
  for (const style of ['egyptian', 'standard'] as const) {
    for (const type of ['freeze_requested', 'freeze_approved', 'freeze_declined']) {
      const payload = pushPayload({ id: 'notice', type, payload: { player_id: 'player', display_name: 'Salma', captain_name: 'Ali' } }, locale, style);
      expect(payload.url).toBe(`/${locale}/${type === 'freeze_requested' ? 'captain/billing' : 'player'}`);
      expect(payload.body).toContain(type === 'freeze_requested' ? 'Salma' : 'Ali');
      expect(payload.body).not.toMatch(/\{|\}/);
    }
  }
});

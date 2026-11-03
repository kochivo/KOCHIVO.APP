import { expect, it } from 'vitest';
import { radarWhatsappUrl } from './radar';

it.each([null, '', ' +()- '])('disables radar contact for an unusable phone: %s', phone => {
  expect(radarWhatsappUrl({ phone, full_name: 'علي', reason: 'no_activity' })).toBeNull();
});

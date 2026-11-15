import { expect, it } from 'vitest';
import { toggleInviteForm, inviteGateState } from './invite-start-forms';

it('disables and clears the gate without forms, defaults on at the first selection', () => {
  expect(inviteGateState([], true)).toEqual({ disabled: true, checked: false });
  expect(toggleInviteForm([], false, 'a')).toEqual({ formIds: ['a'], gate: true });
  expect(toggleInviteForm(['a'], true, 'a')).toEqual({ formIds: [], gate: false });
});
it('preserves an explicit ungated choice and limits selections to five', () => {
  expect(toggleInviteForm(['a'], false, 'b')).toEqual({ formIds: ['a', 'b'], gate: false });
  expect(toggleInviteForm(['a','b','c','d','e'], true, 'f').formIds).toHaveLength(5);
});

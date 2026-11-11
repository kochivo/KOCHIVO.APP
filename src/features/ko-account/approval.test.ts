import { expect, it } from 'vitest';
import { issueApproval, verifyApproval } from './data/approval';
import type { Approval } from './data/approval';

const actor = '00000000-0000-7000-8000-000000000100';
const action: Approval = {
  actor, id: '00000000-0000-7000-8000-000000000101', player: '00000000-0000-7000-8000-000000000102',
  expires: 2000, label: 'Demo', kind: 'renew', payload: { days: 30 },
};
const secret = 'testing-key-1234567890123456789012345';

it('accepts only a valid, unexpired preview for the same verified account', () => {
  const token = issueApproval(action, secret);
  expect(verifyApproval(token, actor, 1000, secret)).toEqual(action);
  expect(verifyApproval(token, action.player, 1000, secret)).toBeNull();
  expect(verifyApproval(token, actor, 2001, secret)).toBeNull();
  expect(verifyApproval(token, actor, 1000, 'wrong-key')).toBeNull();
  expect(verifyApproval('A' + token, actor, 1000, secret)).toBeNull();
});

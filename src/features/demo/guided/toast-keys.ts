import type { MessageKey } from '@/core/i18n/messages';
import type { guidedMessages } from './messages';
export const toastKeys: Record<string, MessageKey<typeof guidedMessages>> = {
  nudge: 'nudgeSuccess', renew: 'renewSuccess', approve: 'approveSuccess', pay: 'paySuccess', swap: 'swapSuccess',
  addex: 'addexSuccess', invite: 'inviteSuccess', set: 'setSuccess', send: 'sendSuccess', reply: 'replySuccess',
  copy: 'copySuccess', wa: 'waSuccess', remind: 'remindSuccess',
};

import { taskKey } from './workspace-model';
import type { WorkspaceItem } from './workspace-types';
export type ReplyDrafts = Record<string, string>;
export function replyDraft(drafts: ReplyDrafts, item: WorkspaceItem) {
  return drafts[taskKey(item)] ?? ('reply' in item ? item.reply ?? '' : '');
}
export function saveReplyDraft(drafts: ReplyDrafts, item: WorkspaceItem, reply: string) {
  return { ...drafts, [taskKey(item)]: reply };
}
export function clearReplyDraft(drafts: ReplyDrafts, item: WorkspaceItem) {
  const next = { ...drafts }; delete next[taskKey(item)]; return next;
}

import type { Json } from '@/types/database';
import type { Option } from '@/features/forms';
import type { InboxItem } from './types';
import type { TriageInputs } from './triage';
import type { taskCounts } from './workspace-model';
export type AssessmentItem = {
  kind: 'assessment'; id: string; player_id: string; player_name: string; title: string;
  created_at: string; reviewed_at: string | null; reply: string | null;
  answers: { id: string; label_ar: string; label_en: string; value: Json; photoCount: number; options?: Option[]; alert?: boolean }[];
};
export type JoinItem = { kind: 'request'; id: string; player_name: string; created_at: string; reviewed_at: null };
export type WorkspaceItem = (InboxItem | AssessmentItem | JoinItem) & { tier?: { name: string; color: string; is_featured?: boolean } | null };
export type ReviewCursor = { at: string; id: string; kind: 'checkin' | 'form' | 'assessment' };
export interface WorkspaceInboxData {
  items: WorkspaceItem[]; triage: TriageInputs; at: string; more: boolean; limit: number; counts?: ReturnType<typeof taskCounts>;
  weekAt?: string; oldest?: string | null; reviews?: { more: boolean; cursor: ReviewCursor | null; total: number };
  statusCounts?: { overdue: ReturnType<typeof taskCounts>; completed: ReturnType<typeof taskCounts> };
}

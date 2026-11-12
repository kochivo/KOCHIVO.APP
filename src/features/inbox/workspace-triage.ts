import { triage, orderTriage } from './triage';
import type { TriageInputs, TriageResult } from './triage';
import type { WorkspaceItem } from './workspace-types';
export function workspaceTriage(item: WorkspaceItem, inputs: TriageInputs, now: Date): TriageResult {
  return item.kind === 'checkin' || item.kind === 'form' ? triage(item, inputs.history, inputs.dailyChecks, now) : { group: 'routine', flags: [] };
}
export function orderWorkspaceTasks(items: WorkspaceItem[], inputs: TriageInputs, now: Date, group: 'all' | TriageResult['group']) {
  const result = (item: WorkspaceItem) => workspaceTriage(item, inputs, now);
  const filtered = items.filter(item => group === 'all' || result(item).group === group);
  return orderTriage(filtered, result);
}

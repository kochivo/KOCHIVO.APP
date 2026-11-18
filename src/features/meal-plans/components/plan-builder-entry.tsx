import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PlanBuilder } from './plan-builder';
import { EditorEntry } from './editor-entry';

export function PlanBuilderEntry({ planId }: { planId: string }) {
  return captainWorkspaceEnabled() ? <EditorEntry planId={planId} /> : <PlanBuilder key={planId} planId={planId} />;
}

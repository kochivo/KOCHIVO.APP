import { RosterLoader } from './roster-loader';
import { loadActivity } from './data/load-activity';
import type { WorkspaceRosterProps } from './types';

export async function WorkspaceRosterEntry(props: WorkspaceRosterProps) {
  return <RosterLoader {...props} details={await loadActivity(props.today)} />;
}

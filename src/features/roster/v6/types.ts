import type { ComponentType } from 'react';
import type { RosterResult } from '../types';
import type { loadRosterExtras } from '../data/v6-roster';

export interface RequestListProps {
  rows: { id: string; full_name: string }[];
  onResolved?: (id: string) => void;
}
export interface WorkspaceRosterProps {
  data: Promise<[RosterResult, string]>;
  today: string;
  extras: Awaited<ReturnType<typeof loadRosterExtras>>;
  RequestList: ComponentType<RequestListProps>;
}

'use client';
import dynamic from 'next/dynamic';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { LoadingState } from '@/ui/loading-state';
import type { AssessmentLayout } from './player-assessments';

const Assessments = dynamic(() => import('./player-assessments').then(module => module.PlayerAssessments), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});

export function PlayerAssessments(props: { actionable?: boolean; layout?: AssessmentLayout }) {
  return captainWorkspaceEnabled() ? <Assessments {...props} /> : null;
}

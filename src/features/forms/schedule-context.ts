import type { AssessmentSchedule } from '@/types/assessment-schedules';

export type ScheduleContext = {
  schedules: AssessmentSchedule[];
  players: { id: string; name: string }[];
  ready?: boolean;
};

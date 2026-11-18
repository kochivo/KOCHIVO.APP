import 'server-only';
import { z } from 'zod';
import { getAthleteDetails } from './tools/get-athlete-details';
import { getAthleteProgress } from './tools/get-athlete-progress';
import { getCoachAnalytics } from './tools/get-coach-analytics';
import { getCoachProfile } from './tools/get-coach-profile';
import { getDues } from './tools/get-dues';
import { getExpiringSubscriptions } from './tools/get-expiring-subscriptions';
import { getWorkoutProgram } from './tools/get-workout-program';
import { listAthletes } from './tools/list-athletes';
import { listExercises } from './tools/list-exercises';
import { listWorkoutPrograms } from './tools/list-workout-programs';
import { getMyNutritionToday } from './tools/get-my-nutrition-today';
import { getMyWorkoutToday } from './tools/get-my-workout-today';
import { logMyMeal } from './tools/log-my-meal';
import type { AiActor } from './types';

const tools = [
  getCoachProfile, listAthletes, getAthleteDetails, getAthleteProgress, listWorkoutPrograms,
  getWorkoutProgram, listExercises, getExpiringSubscriptions, getCoachAnalytics, getDues,
  getMyNutritionToday, getMyWorkoutToday, logMyMeal,
];

export const registry = new Map(tools.map(tool => [tool.name, tool]));

export function listTools(role: AiActor['role']) {
  return tools.filter(tool => tool.roles.includes(role)).map(({ name, description, kind, input }) => ({
    name, description, kind, inputJsonSchema: z.toJSONSchema(input, { target: 'draft-7', io: 'input' }),
  }));
}

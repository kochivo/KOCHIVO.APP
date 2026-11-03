'use server';

import { saveIntakeAt } from './save-intake-internal';

export async function saveIntake(input: unknown): Promise<{ error?: string }> {
  return saveIntakeAt(input, new Date());
}

import { expect, it } from 'vitest';
import { ExerciseFormEntry, ExerciseLibraryEntry, LightDayEntry, TasksStateEntry } from './index';

it('keeps the public client entries importable without a server-only mock', () => {
  for (const entry of [ExerciseFormEntry, ExerciseLibraryEntry, LightDayEntry, TasksStateEntry]) {
    expect(entry).toBeTypeOf('function');
  }
});

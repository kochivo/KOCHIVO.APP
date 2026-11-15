import { expect, it } from 'vitest';
import * as level from './level-up';

it('queues rank before set medals and never repeats acknowledged medals', () => {
  const values = new Map<string,string>([['kochivo:last-seen-medal-rank:a','iron']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key,value); } };
  const counts = { workouts: 10, full_weeks: 0, prs: 0, crowns: 0, crown_streak: 0 };
  const queue = 'pendingCelebrations' in level ? level.pendingCelebrations(storage,'a',100,counts) : [];
  expect(queue.map(item => item.id)).toEqual(['rank:bronze','workouts:0','workouts:1']);
  if ('acknowledgeCelebration' in level) for (const item of queue) level.acknowledgeCelebration(storage,'a',item);
  expect('pendingCelebrations' in level && level.pendingCelebrations(storage,'a',100,counts)).toEqual([]);
});
it('celebrates a legend star once without repeating set medals', () => {
  const values = new Map<string,string>([['kochivo:last-seen-medal-rank:a','legend']]);
  const storage = { getItem: (key:string)=>values.get(key)??null, setItem: (key:string,value:string)=>{values.set(key,value);} };
  const queue = level.pendingCelebrations(storage,'a',1200);
  expect(queue.map(item=>item.id)).toEqual(['star:1']);
  for (const item of queue) level.acknowledgeCelebration(storage,'a',item);
  expect(level.pendingCelebrations(storage,'a',1200)).toEqual([]);
});

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { afterEach,expect,it,vi } from 'vitest';
import { loadPlayerFile } from '@/features/player-file';
afterEach(() => vi.unstubAllEnvs());
it('bounds answered requests to 12, selects needed columns and labels history, with identical flag-off output',async () => {
  const calls:{table:string;columns:string;limit?:number}[] = [];
  const client = {from:(table:string) => {
    const call = {table,columns:'',limit:0};calls.push(call);
    const data = table === 'form_requests' ? [{id:'r',form_id:'f',answered_at:'2026-11-03T10:00:00Z',forms:{title:'Weekly'}}]
      : table === 'form_answers' ? [{request_id:'r',question_id:'q',value:72}]
      : table === 'form_questions' ? [{id:'q',form_id:'f',maps_to:'weight'}] : [];
    const query = {select:(columns:string) => {call.columns=columns;return query;},eq:() => query,not:() => query,
      in:() => query,order:() => query,limit:(limit:number) => {call.limit=limit;return query;},
      then:(resolve:(result:unknown)=>unknown) => Promise.resolve(resolve({data,error:null}))};
    return query;
  }} as unknown as SupabaseClient<AppDatabase>;
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE','0');
  expect(await loadPlayerFile(client,'p',{now:new Date('2026-11-04T10:00:00Z')})).toEqual({facts:{},history:[]});
  expect(calls.map(c => c.table)).toEqual(['player_intake','check_ins']);
  calls.length=0;vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE','1');
  const file = await loadPlayerFile(client,'p',{now:new Date('2026-11-04T10:00:00Z')});
  expect(file.facts.weight?.value).toBe(72);
  expect(file.history[0]?.source.title).toBe('Weekly');
  expect(calls.find(c => c.table === 'form_requests')?.limit).toBe(12);
  expect(calls.filter(c => c.table.startsWith('form_')).every(c => !c.columns.includes('*'))).toBe(true);
});

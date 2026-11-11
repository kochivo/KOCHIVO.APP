import { expect, it } from 'vitest';
import { formSnapshot,formHistory,mergePlayerFile } from '@/features/player-file';
it('maps only declared facts and merges them chronologically with check-ins', () => {
  const snapshot = formSnapshot({id:'r',answered_at:'2026-11-03T10:00:00Z',title:'Weekly'},
    [{question_id:'weight',value:72},{question_id:'private',value:'secret'}, {question_id:'days',value:['0','6']}],
    [{id:'weight',maps_to:'weight'},{id:'private',maps_to:null},{id:'days',maps_to:'trainingDays'}]);
  expect(snapshot.facts).toEqual({weight:72,trainingDays:[0,6]});
  const checkin = {source:{kind:'checkin',id:'c',at:'2026-11-02T10:00:00Z'},facts:{weight:73}};
  const facts = mergePlayerFile([snapshot,checkin],new Date('2026-11-04T10:00:00Z'));
  expect(facts.weight?.value).toBe(72);
  expect(facts.weight?.previous?.value).toBe(73);
  expect(formHistory([snapshot,checkin])[0]?.source.title).toBe('Weekly');
  expect(formSnapshot({id:'r',answered_at:'x'},[{question_id:'w',value:'bad'}],[{id:'w',maps_to:'weight'}]).facts).toEqual({});
});
it('keeps missing and invalid answers from erasing existing check-in facts',() => {
  const snapshot = formSnapshot({id:'r',answered_at:'2026-11-03T10:00:00Z'},
    [{question_id:'weight',value:null},{question_id:'note',value:''},{question_id:'injuries',value:['knee']}],
    [{id:'weight',maps_to:'weight'},{id:'note',maps_to:'note'},{id:'injuries',maps_to:'injuries'}]);
  const checkin = {source:{kind:'checkin',id:'c',at:'2026-11-02T10:00:00Z'},facts:{weight:73,note:'Context'}};
  const facts = mergePlayerFile([snapshot,checkin],new Date('2026-11-04T10:00:00Z'));
  expect(facts.weight?.value).toBe(73);
  expect(facts.note?.value).toBe('Context');
  expect(facts.injuries?.value).toEqual(['knee']);
});

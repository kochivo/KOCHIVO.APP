import { beforeEach,expect,it,vi } from 'vitest';
import { stableId } from '@/core/offline/ids';
import type { RequestData } from './request-types';
const mocks = vi.hoisted(() => ({access:vi.fn(),load:vi.fn(),write:vi.fn()}));
vi.mock('server-only',() => ({}));
vi.mock('next/navigation',() => ({unstable_rethrow:() => {}}));
vi.mock('./data/player-access',() => ({playerFormsAccess:mocks.access}));
vi.mock('./data/request-load',() => ({loadRequest:mocks.load}));
const r='00000000-0000-7000-8000-000000000001',q='00000000-0000-7000-8000-000000000002';
const data = {request:{id:r,player_id:'p',answered_at:null,reviewed_at:null},title:'Weekly',answers:[],questions:[{
  id:q,form_id:'f',position:0,type:'yesno',required:true,label_ar:'Pain',label_en:'Pain',options:[],maps_to:null,alert_on:null,
}]} as unknown as RequestData;
beforeEach(() => {
  mocks.write.mockReset().mockResolvedValue({error:null});
  mocks.load.mockReset().mockImplementation(async () => mocks.write.mock.calls.length
    ? {...data,request:{...data.request,answered_at:'2026-11-03T10:00:00Z'},answers:mocks.write.mock.calls[0]?.[0]} : data);
  const query = {upsert:mocks.write,select:() => query,eq:() => query,single:async () => ({error:null,data:{answered_at:'2026-11-03T10:00:00Z'}})};
  mocks.access.mockResolvedValue({player:'p',client:{from:() => query}});
});
it('writes all answers in one statement, preserving stable ids and allowing a confirmed retry after review',async () => {
  const {submitAnswers} = await import('./data/submit-answers');
  const draft = {[q]:{value:false,photo_paths:[]}};
  expect(await submitAnswers({requestId:r,draft})).toEqual({ok:true});
  expect(mocks.write).toHaveBeenCalledOnce();
  const id=await stableId(r,q);
  expect(mocks.write).toHaveBeenCalledWith([{id,request_id:r,question_id:q,value:false,photo_paths:[]}],{onConflict:'id',ignoreDuplicates:true});
  mocks.write.mockClear();
  mocks.load.mockResolvedValue({...data,request:{...data.request,answered_at:'2026-11-03T10:00:00Z',reviewed_at:'2026-11-03T11:00:00Z'},
    answers:[{id,request_id:r,question_id:q,value:false,photo_paths:[]}]});
  expect(await submitAnswers({requestId:r,draft})).toEqual({ok:true});
  expect(mocks.write).not.toHaveBeenCalled();
  expect(await submitAnswers({requestId:r,draft:{[q]:{value:true,photo_paths:[]}}})).toEqual({ok:false});
});
it('rejects invalid required answers and foreign photo paths before any writes',async () => {
  const {submitAnswers} = await import('./data/submit-answers');
  expect(await submitAnswers({requestId:r,draft:{}})).toEqual({ok:false});
  expect(await submitAnswers({requestId:r,draft:{[q]:{value:false,photo_paths:['forms/other/r/x.jpg']}}})).toEqual({ok:false});
  expect(mocks.write).not.toHaveBeenCalled();
});

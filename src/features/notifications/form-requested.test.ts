import { afterEach,expect,it,vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { notificationHref,notificationTextKey } from './format';
import { messages } from './messages';
import { latestNotifications,unreadCount } from './data/notifications';
import type { Notification } from './types';
const {load} = vi.hoisted(() => ({load:vi.fn()}));
vi.mock('@/core/supabase/lazy',() => ({loadSupabaseBrowser:load}));
afterEach(() => vi.unstubAllEnvs());
const request='00000000-0000-7000-8000-000000000001';
const form='00000000-0000-7000-8000-000000000002';
const notice:Notification = {id:'notice',type:'form_requested',payload:{name:'Weekly',request_id:request,form_id:form},
  created_at:'2026-11-03T10:00:00Z',is_read:false};
it('renders dedicated Arabic and English copy and links to the answer route',() => {
  expect(notificationTextKey(notice)).toBe('form_requested');
  expect(createT(messages,'ar')(notificationTextKey(notice),{name:'Weekly'})).toBe('الكابتن مستني ردّك على Weekly');
  expect(createT(messages,'en')(notificationTextKey(notice),{name:'Weekly'})).toBe('Your captain is waiting for: Weekly');
  expect(notificationHref(notice)).toBe(`/player/forms/${request}`);
  expect(notificationHref({...notice,payload:{}})).toBe('/player');
  expect(notificationHref({...notice,payload:{request_id:'a/b?c'}})).toBe('/player/forms/a%2Fb%3Fc');
});
it('preserves form/request ids from stored notifications without accepting non-string ids',async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE','1');
  const data=[notice,{...notice,id:'bad',payload:{name:'Weekly',request_id:42,form_id:null}}];
  const query={select:vi.fn(),not:vi.fn(),order:vi.fn(),limit:vi.fn().mockResolvedValue({data,error:null})};
  query.select.mockReturnValue(query);query.not.mockReturnValue(query);query.order.mockReturnValue(query);
  load.mockResolvedValue({from:() => query});
  const result=await latestNotifications();
  expect(result[0]?.payload).toMatchObject({name:'Weekly',request_id:request,form_id:form});
  expect(result[1]?.payload.request_id).toBeUndefined();
  expect(result[1]?.payload.form_id).toBeUndefined();
});
it('hides form notifications and their unread count while the workspace flag is off',async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE','0');
  const query={select:vi.fn(),eq:vi.fn(),not:vi.fn(),order:vi.fn(),limit:vi.fn().mockResolvedValue({data:[],error:null}),
    then:(resolve:(result:unknown)=>unknown) => Promise.resolve(resolve({count:0,error:null}))};
  for(const method of [query.select,query.eq,query.not,query.order]) method.mockReturnValue(query);
  load.mockResolvedValue({from:() => query});
  await latestNotifications();
  expect(query.not).toHaveBeenCalledWith('type','eq','form_requested');
  query.not.mockClear();
  expect(await unreadCount()).toBe(0);
  expect(query.not).toHaveBeenCalledWith('type','eq','form_requested');
});

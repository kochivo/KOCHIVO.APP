import { expect, it } from 'vitest';
import { pushPayload } from './payload';

const cases = [
  ['checkin_submitted', {}, '/captain/players/p/checkins', 'Player بعت المتابعة', 'أرسل Player المتابعة', 'Player submitted a check-in'],
  ['form_answered', { request_id: 'r/1' }, '/captain/players/p/assessments?requestId=r%2F1#assessment-details', 'Player جاوب على الفورم', 'أجاب Player عن النموذج', 'Player answered a form'],
  ['swap_requested', {}, '/captain/players/p', 'Player طالب يبدّل تمرين', 'طلب Player تبديل تمرين', 'Player requested an exercise swap'],
  ['form_check_submitted', {}, '/captain/tasks', 'Player بعت فيديو أداء', 'أرسل Player فيديو أداء', 'Player submitted a form video'],
  ['receipt_submitted', {}, '/captain/billing', 'Player رفع إيصال دفع', 'رفع Player إيصال دفع', 'Player uploaded a payment receipt'],
  ['coach_replied', { kind: 'checkin' }, '/player/captain', 'كابتن Coach رد على المتابعة', 'ردّ المدرب Coach على المتابعة', 'Coach replied to your check-in'],
  ['coach_replied', { kind: 'form_check' }, '/player/captain', 'كابتن Coach رد على فيديو الأداء', 'ردّ المدرب Coach على فيديو الأداء', 'Coach replied to your form video'],
  ['swap_decided', { status: 'approved' }, '/player', 'كابتن Coach وافق على تبديل التمرين', 'وافق المدرب Coach على تبديل التمرين', 'Coach approved your exercise swap'],
  ['swap_decided', { status: 'declined' }, '/player', 'كابتن Coach رفض تبديل التمرين', 'رفض المدرب Coach تبديل التمرين', 'Coach declined your exercise swap'],
] as const;

it.each(cases)('builds private named %s push text and links in all three styles', (type, extra, path, ar, arStd, en) => {
  const row = { id: 'event', type, payload: { player_id: 'p', display_name: 'Player', captain_name: 'Coach',
    notes: 'private notes', captain_reply: 'private reply', amount_egp: 12345, ...extra } };
  expect(pushPayload(row, 'ar')).toEqual({ title: 'إشعارات كوتشيفو', body: ar, url: `/ar${path}`, tag: 'event' });
  expect(pushPayload(row, 'ar', 'standard')).toEqual({ title: 'إشعارات كوتشيفو', body: arStd, url: `/ar${path}`, tag: 'event' });
  expect(pushPayload(row, 'en')).toEqual({ title: 'KOCHIVO notifications', body: en, url: `/en${path}`, tag: 'event' });
});

it('uses existing fallback destinations and encodes external-looking ids', () => {
  expect(pushPayload({ id: 'n', type: 'form_answered', payload: null }).url).toBe('/ar/captain/players');
  expect(pushPayload({ id: 'n', type: 'form_answered', payload: { player_id: '//evil' } }).url).toBe('/ar/captain/players/%2F%2Fevil/assessments');
});

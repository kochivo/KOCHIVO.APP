import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';
export const messages = defineMessages({ ar: {
  title: 'وضع رمضان', enable: 'شغّل وضع رمضان', autoOff: 'من أول رمضان لآخره، ويرجع لوحده بعد العيد.',
  training: 'التمرين إمتى؟', before_iftar_1h: 'قبل الفطار بساعة', after_iftar_2h: 'بعد الفطار بساعتين',
  after_taraweeh: 'بعد التراويح', before_suhoor: 'قبل السحور', intensity: 'شدة التمرين', same: 'زي ما هو',
  lighter_20: 'أخف 20%', maintenance: 'صيانة بس', water: 'الماية بين الفطار والسحور (مل)',
  apply: 'طبّق على {n} لاعب', exempt: 'مش صايم', empty: 'مفيش لاعيبة لسه', error: 'مقدرناش نحفظ التغييرات. جرّب تاني.',
  retry: 'جرّب تاني', saved: 'اتطبّق وضع رمضان', detail: 'مواعيد الفريق اتحدّثت', city: 'مدينتك (لمواعيد الصلاة)',
  automatic: 'تلقائي', dates: 'من {start} لحد {end}', meals: 'نفس السعرات، متقسمة على فطار · سناك بعد التمرين · سحور',
}, get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; }, en: {
  title: 'Ramadan mode', enable: 'Enable Ramadan mode', autoOff: 'From the start of Ramadan to Eid, then it switches off automatically.',
  training: 'Training time', before_iftar_1h: 'One hour before iftar', after_iftar_2h: 'Two hours after iftar',
  after_taraweeh: 'After taraweeh', before_suhoor: 'Before suhoor', intensity: 'Workout intensity', same: 'Same',
  lighter_20: '20% lighter', maintenance: 'Maintenance', water: 'Water between iftar and suhoor (ml)',
  apply: 'Apply to {n} players', exempt: 'Not fasting', empty: 'No players yet', error: 'Could not save changes. Try again.',
  retry: 'Try again', saved: 'Ramadan mode applied', detail: 'Team schedules updated', city: 'Your city (prayer times)',
  automatic: 'Automatic', dates: '{start} to {end}', meals: 'Same calories, split across iftar, post-workout snack and suhoor.',
} });

import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';
export const messages = defineMessages({ ar: { lighter: 'رمضان: أخف 20%', maintenance: 'رمضان: صيانة بس',
  weight: 'الوزن المقترح: {n} كجم', sets: 'المجموعات المقترحة: {n}' }, get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { lighter: 'Ramadan: 20% lighter', maintenance: 'Ramadan: maintenance', weight: 'Target load: {n} kg', sets: 'Target sets: {n}' } });

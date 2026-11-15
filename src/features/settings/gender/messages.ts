const arStd = { me: 'أنا', male: 'مدرب', female: 'مدربة', optional: 'اختياري' } as const;
export const messages = {
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { me: 'أنا', male: 'كابتن', female: 'كابتنة', optional: 'اختياري' },
  en: { me: 'I am', male: 'Male coach', female: 'Female coach', optional: 'Optional' },
};

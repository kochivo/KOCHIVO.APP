const arStd = { reveal: 'اضغطي لعرض الصورة' } as const;
export const messages = {
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { reveal: 'اضغطي عشان تشوفي الصورة' }, en: { reveal: 'Tap to view photo' },
};

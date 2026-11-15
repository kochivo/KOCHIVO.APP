const arStd = { light: 'يوم خفيف' } as const;
export const messages = {
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { light: 'يوم خفيف' }, en: { light: 'Light day' },
};

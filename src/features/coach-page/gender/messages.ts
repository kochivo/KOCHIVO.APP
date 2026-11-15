const arStd = { female: 'مدربة' } as const;
export const messages = {
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { female: 'كابتنة' }, en: { female: 'Female coach' },
};

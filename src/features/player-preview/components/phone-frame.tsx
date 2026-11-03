import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return <section aria-label="معاينة موبايل اللاعب" className="glass-strong mx-auto flex h-[700px] max-h-[85dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-[3rem] border border-line p-3">
    {children}
  </section>;
}

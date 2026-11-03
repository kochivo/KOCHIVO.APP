import { whatsappUrl } from '@/lib/whatsapp';
import { SignOutButton } from './sign-out-button';

export function SuspendedScreen() {
  const whatsapp = whatsappUrl({ phone: process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? '' });
  return <main dir="rtl" className="flex min-h-dvh items-center justify-center p-6 text-start">
    <section className="glass-strong w-full max-w-md space-y-6 rounded-card p-8" aria-labelledby="suspended-title">
      <h1 id="suspended-title" className="text-2xl font-bold">حسابك متوقف مؤقتاً</h1>
      <p className="text-muted">كلّم الدعم على واتساب علشان نرجّعه</p>
      {whatsapp && <a className="flex min-h-12 items-center justify-center rounded-control border border-line px-6 font-bold text-ink"
        href={whatsapp}>كلّم الدعم على واتساب</a>}
      <SignOutButton />
    </section>
  </main>;
}

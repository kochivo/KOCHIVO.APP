import Link from 'next/link';

export function DonePanel() {
  return <section className="glass-strong space-y-5 rounded-card p-8 text-center">
    <h1 className="text-3xl font-extrabold">خلصت التمرين</h1>
    <p className="text-muted">اتسجّل على موبايلك، وهيوصل للكابتن أول ما النت يرجع</p>
    <Link href="/player" className="glass inline-flex min-h-12 items-center rounded-control px-5">ارجع للرئيسية</Link>
  </section>;
}

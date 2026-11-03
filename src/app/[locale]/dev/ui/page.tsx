import type { Metadata } from 'next';
import { UiDemo } from './demo';

export const metadata: Metadata = { robots: { index: false } };

export default function UiPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pt-8 pb-32">
      <p className="text-sm text-warn">دي صفحة تطوير لعرض مكونات الواجهة</p>
      <h1 className="text-3xl font-extrabold">مكونات كوتشيفو</h1>
      <UiDemo />
    </main>
  );
}

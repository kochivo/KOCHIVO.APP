export const metadata = { title: 'مفيش نت' };

// Served by the service worker when a page that was never cached is opened offline.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">مفيش اتصال دلوقتي</h1>
      <p className="text-muted">تمرين النهارده متسجّل على موبايلك وهيتبعت أول ما النت يرجع.</p>
    </main>
  );
}

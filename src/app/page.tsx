import Image from 'next/image';

// Placeholder entry point; role-based routing (captain / player) lands in T-003.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Image src="/brand/logo-primary.png" alt="KOCHIVO" width={320} height={91} priority />
      <p className="text-muted">الأساس جاهز. الشاشات جاية في المراحل الجاية.</p>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/core/supabase/browser';

export function DemoBanner({ hours }: { hours: number }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <aside className="glass-strong mb-4 flex flex-wrap items-center justify-between gap-x-4 rounded-control px-4 text-sm" aria-label="وضع الديمو">
    <p>وضع الديمو · بيتمسح بعد {new Intl.NumberFormat('ar-EG').format(hours)} ساعة</p>
    <a href="/login?tab=signup" aria-disabled={pending} className="flex min-h-12 items-center font-bold text-lime" onClick={async (event) => {
      event.preventDefault();
      if (pending) return;
      setPending(true); setError('');
      try {
        const result = await supabaseBrowser().auth.signOut();
        if (result.error) throw result.error;
        router.push('/login?tab=signup');
        router.refresh();
      } catch { setError('مش قادرين نخرج من الديمو. جرّب تاني'); setPending(false); }
    }}>{pending ? 'جاري الخروج' : 'اعمل حسابك'}</a>
    {error && <p role="alert" className="w-full pb-3 text-danger">{error}</p>}
  </aside>;
}

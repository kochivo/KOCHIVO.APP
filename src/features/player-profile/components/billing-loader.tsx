'use client';
import dynamic from 'next/dynamic';

const Billing = dynamic(() => import('@/features/billing').then(module => module.BillingManagerLoader), {
  ssr: false, loading: () => <div aria-hidden className="glass-strong min-h-32 animate-pulse rounded-card" />,
});
export function BillingLoader(props: { playerId: string; name: string; today: string }) {
  return <Billing {...props} />;
}

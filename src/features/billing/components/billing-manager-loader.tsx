'use client';
import dynamic from 'next/dynamic';

const Card = dynamic(() => import('./billing-manager-card').then(module => module.BillingManagerCard), {
  ssr: false, loading: () => <div aria-hidden className="glass-strong min-h-32 animate-pulse rounded-card" />,
});
export function BillingManagerLoader(props: { playerId: string; name: string; today: string; autoActivate?: boolean }) {
  return <Card key={props.playerId} {...props} />;
}

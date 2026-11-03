import { Button, GlassCard, ProgressBar } from '@/ui';
import { localDate } from '@/lib/dates';
import { waLink } from '../renew';
import type { Plan } from '../types';

const tierNames: Record<string, string> = { entry: 'البداية', champion: 'البطل', legend: 'الأسطورة', empire: 'الإمبراطورية' };

export function PlanCard({ plan, used, subscriptionEnd }: { plan: Plan; used: number; subscriptionEnd: string | null }) {
  const tierName = tierNames[plan.tier] ?? plan.tier;
  const upgrade = waLink(process.env.NEXT_PUBLIC_OWNER_WHATSAPP, `عايز أرقّي باقتي في كوتشيفو. باقتي الحالية ${tierName}. إيه خطوات الدفع والتفعيل؟`);
  return (
    <GlassCard level="strong" className="space-y-5 p-6">
      <div><h2 className="text-xl font-bold">باقتي</h2><p className="mt-3 text-3xl font-extrabold">{tierName}</p></div>
      <p className="text-muted">{plan.price_egp} جنيه / شهر · لحد {plan.player_limit} لاعب</p>
      <div className="space-y-3">
        <p className="text-lg font-bold">{used} من {plan.player_limit} لاعب</p>
        <ProgressBar value={used} max={plan.player_limit} aria-label="اللاعبين المستخدمين من الباقة" aria-valuetext={`${used} من ${plan.player_limit} لاعب`} />
      </div>
      {subscriptionEnd && <p className="text-sm text-muted">باقتك مدفوعة لحد <time dateTime={subscriptionEnd}>{localDate(new Date(subscriptionEnd))}</time></p>}
      {upgrade ? <a href={upgrade} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-line px-4 font-bold hover:bg-surface-raised">رقّي باقتك</a>
        : <><Button variant="ghost" disabled className="min-h-12 w-full" aria-describedby="owner-phone-missing">رقّي باقتك</Button><p id="owner-phone-missing" className="text-sm text-muted">رقم الدعم لسه متضافش</p></>}
      <p className="text-sm text-muted">بعد الدفع، الإدارة بتفعّل الباقة</p>
    </GlassCard>
  );
}

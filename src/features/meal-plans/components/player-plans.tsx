'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/ui';
import { createPlan, listPlayerPlans } from '../data/plan-io';
import type { PlanSummary } from '../types';

const statuses: Record<string, string> = { active: 'متفعّل', draft: 'مسودة', archived: 'متأرشف' };
export function PlayerPlans({ playerId }: { playerId: string }) {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('نظام جديد');
  useEffect(() => {
    let current = true;
    listPlayerPlans(playerId).then(value => { if (current) { setPlans(value); setError(''); } })
      .catch(() => { if (current) setError('الأنظمة متحملتش. جرّب تاني'); });
    return () => { current = false; };
  }, [playerId, retry]);
  async function create() {
    setBusy(true); setError('');
    try { router.push(`/captain/nutrition/${await createPlan(playerId, title)}`); }
    catch { setError('النظام متعملش. جرّب تاني'); setBusy(false); }
  }
  return <div className="mx-auto grid max-w-4xl gap-5">
    <h1 className="text-3xl font-bold">الأنظمة الغذائية</h1>
    <div className="glass flex flex-wrap items-end gap-3 rounded-card p-4">
      <label className="grid gap-2">اسم النظام<input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} className="min-h-12 rounded-control bg-surface px-3" /></label>
      <Button variant="secondary" disabled={busy || !title.trim()} onClick={() => void create()}>نظام جديد</Button>
    </div>
    {busy && <p role="status">جاري إنشاء النظام</p>}
    {error && <div role="alert">{error}<Button variant="secondary" onClick={() => setRetry(n => n + 1)}>جرّب تاني</Button></div>}
    {!plans && !error && <p role="status">جاري تحميل الأنظمة</p>}
    {plans?.length === 0 && <p>لسه مفيش أنظمة. اعمل نظام جديد</p>}
    <ul className="grid gap-3">{plans?.map(plan => <li key={plan.id}><Link href={`/captain/nutrition/${plan.id}`} className="glass flex min-h-12 items-center justify-between gap-3 rounded-control p-4">
      <span>{plan.title}</span><span className="text-muted">{statuses[plan.status]}</span>
    </Link></li>)}</ul>
  </div>;
}

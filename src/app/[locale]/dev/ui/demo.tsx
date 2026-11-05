'use client';

import { useState } from 'react';
import { Dumbbell, Home, Plus, User } from 'lucide-react';
import {
  BottomNav, Button, Chip, EmptyState, ErrorState, GlassCard, IconButton,
  LoadingState, ProgressBar, Segmented, Stepper, SyncPill, TextField,
} from '@/ui';

export function UiDemo() {
  const [period, setPeriod] = useState('day');
  const [view, setView] = useState('all');
  const [count, setCount] = useState('two');
  const [selected, setSelected] = useState(true);
  const [weight, setWeight] = useState(20);
  const [retry, setRetry] = useState(false);
  const [added, setAdded] = useState(false);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-bold">الأزرار والكروت</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => setAdded(!added)}>{added ? 'اتضاف' : 'ضيف تمرين'}</Button>
          <Button variant="secondary">التفاصيل</Button>
          <Button variant="ghost">رجوع</Button>
          <Button disabled>مش متاح</Button>
          <IconButton aria-label="ضيف تمرين" onClick={() => setAdded(!added)}><Plus aria-hidden className="size-5" /></IconButton>
          <IconButton aria-label="الإضافة مش متاحة" disabled><Plus aria-hidden className="size-5" /></IconButton>
        </div>
        <Button size="xl" variant="secondary">ابدأ التمرين</Button>
        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard className="p-5">كارت عادي</GlassCard>
          <GlassCard level="raised" className="p-5">كارت بارز</GlassCard>
          <GlassCard level="strong" className="p-5"><span className="text-4xl font-extrabold">120</span></GlassCard>
        </div>
      </section>
      <section id="profile" className="space-y-4">
        <h2 className="text-xl font-bold">الحقول</h2>
        <TextField label="اسمك" placeholder="اكتب اسمك" />
        <TextField label="الموبايل" type="tel" dir="ltr" hint="اكتب رقمك كامل" />
        <TextField label="الإيميل" type="email" dir="ltr" defaultValue="player@" error="راجع الإيميل" />
        <TextField label="الكابتن" defaultValue="أحمد" disabled />
      </section>
      <section id="workout" className="space-y-4">
        <h2 className="text-xl font-bold">الاختيارات</h2>
        <Segmented aria-label="الفترة" value={period} onChange={setPeriod} options={[{ value: 'day', label: 'يوم' }, { value: 'week', label: 'أسبوع' }]} />
        <Segmented aria-label="العرض" value={view} onChange={setView} options={[{ value: 'all', label: 'الكل' }, { value: 'done', label: 'خلص' }, { value: 'pending', label: 'فاضل' }]} />
        <Segmented aria-label="عدد الأيام" value={count} onChange={setCount} options={[{ value: 'one', label: 'يوم' }, { value: 'two', label: 'يومين' }, { value: 'three', label: 'تلاتة' }, { value: 'four', label: 'أربعة' }]} />
        <div className="flex flex-wrap gap-2">
          <Chip pressed={selected} onClick={() => setSelected(!selected)}>تمرين</Chip>
          <Chip pressed={!selected} onClick={() => setSelected(!selected)}>أكل</Chip>
          <Chip pressed={false} disabled>مش متاح</Chip>
        </div>
        <Stepper label="الوزن" value={weight} step={2.5} onChange={setWeight} />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">التقدم والمزامنة</h2>
        <ProgressBar aria-label="لسه مبدأش" value={0} max={100} />
        <ProgressBar aria-label="تقدم الرفع" value={45} max={100} />
        <ProgressBar aria-label="اكتمل الرفع" value={100} max={100} />
        <div className="flex flex-wrap gap-3">
          <SyncPill state="synced" /><SyncPill state="pending" pending={3} /><SyncPill state="offline" />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">حالات الشاشة</h2>
        <EmptyState icon={Dumbbell} title="لسه مفيش تمارين" body="تمارينك هتظهر هنا" />
        <EmptyState icon={Dumbbell} title={added ? 'التمرين اتضاف' : 'ضيف أول تمرين'} body="ابدأ بخطوة بسيطة" action={{ label: added ? 'ضيف كمان' : 'ضيف تمرين', onClick: () => setAdded(true) }} />
        {retry ? <p role="status" className="text-muted">جربنا تاني، مفيش بيانات في العرض ده</p> : <ErrorState message="مش قادرين نحمّل البيانات" retryLabel="جرّب تاني" onRetry={() => setRetry(true)} />}
        <LoadingState />
      </section>
      <BottomNav aria-label="التنقل الرئيسي" items={[
        { href: '/dev/ui', label: 'الرئيسية', icon: Home, active: true },
        { href: '/dev/ui#workout', label: 'التمرين', icon: Dumbbell },
        { href: '/dev/ui#profile', label: 'حسابي', icon: User },
      ]} />
    </div>
  );
}

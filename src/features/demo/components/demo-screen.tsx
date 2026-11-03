'use client';
import { useCallback, useState } from 'react';
import { Button } from '@/ui';
import { publicConfig } from '@/lib/public-config';
import { startDemo } from '../data/start-demo';
import { TurnstileWidget } from './turnstile-widget';

export function DemoScreen() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const captchaError = useCallback(() => {
    setToken(''); setError('اتأكد إنك مش روبوت وجرّب تاني');
  }, []);
  const siteKey = publicConfig.turnstileSiteKey;
  return <main className="mx-auto flex min-h-dvh max-w-lg items-center p-6">
    <section className="glass-strong w-full space-y-5 rounded-card p-6">
      <h1 className="text-3xl font-extrabold">جرّب الديمو</h1>
      <p className="text-muted">شوف لوحة الكابتن بلاعبين وبيانات تجريبية</p>
      {siteKey && <TurnstileWidget key={attempt} siteKey={siteKey} onToken={setToken} onError={captchaError} />}
      <Button className="min-h-12 w-full" disabled={pending || Boolean(siteKey && !token)} onClick={async () => {
        setPending(true); setError('');
        const failure = await startDemo((path) => window.location.assign(path), token || undefined);
        if (failure) {
          setError(failure); setPending(false); setToken(''); setAttempt((value) => value + 1);
        }
      }}>{pending ? 'جاري تجهيز الديمو' : 'ادخل الديمو'}</Button>
      <p className="text-sm text-muted">حساب تجريبي بيتمسح بعد ٢٤ ساعة</p>
      {pending && <p role="status" className="text-sm text-muted">بنجهّز البيانات التجريبية</p>}
      {error && <div role="alert" className="space-y-2 text-sm text-danger"><p>{error}</p>
        <Button variant="ghost" className="min-h-12" disabled={pending} onClick={() => {
          setError(''); setToken(''); setAttempt((value) => value + 1);
        }}>جرّب تاني</Button>
      </div>}
    </section>
  </main>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { localeDir } from '@/core/i18n/locale';
import { Button, TextField } from '@/ui';
import { KoPlay } from '@/ui/icons/ko-play';
import { LanguageSwitch } from '@/ui/language-switch';
import { messages } from '../messages';
import { inviteDestination, welcomeAction } from '../welcome-navigation';
import { WelcomeRoleCard } from './welcome-role-card';
import { AuthLogo } from './auth-logo';
import styles from './welcome.module.css';

export function WelcomeFlow() {
  const t = useT(messages);
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [role, setRole] = useState<'player' | 'captain'>('player');
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const saved = window.history.state?.welcomeStep;
    const initial = window.location.hash === '#code' ? 3 : saved === 2 || saved === 3 ? saved : 1;
    // Direct code entry still needs local welcome and role entries for phone Back.
    if (window.location.hash === '#code' && saved !== 3) {
      const base = window.location.pathname + window.location.search;
      window.history.replaceState({ ...window.history.state, welcomeStep: 1 }, '', base);
      window.history.pushState({ ...window.history.state, welcomeStep: 2 }, '', base);
      window.history.pushState({ ...window.history.state, welcomeStep: 3 }, '', `${base}#code`);
    }
    window.history.replaceState({ ...window.history.state, welcomeStep: initial }, '');
    const restore = () => {
      const value = window.history.state?.welcomeStep;
      setStep(value === 2 || value === 3 ? value : 1);
      setInvalid(false);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation = panel.current?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: 'ease-out' });
      return () => animation?.cancel();
    }
  }, [step]);
  function act(action: Parameters<typeof welcomeAction>[0]) {
    const next = welcomeAction(action);
    if (typeof next === 'string') { window.location.assign(next); return; }
    window.history.pushState({ ...window.history.state, welcomeStep: next }, '');
    setStep(next);
    setInvalid(false);
  }
  return <main dir={localeDir(locale)} className={styles.screen}>
    <div ref={panel} className={styles.panel}>
      {step === 1 ? <>
        <div className={styles.art}>
          <AuthLogo /><span className={styles.slash} aria-hidden="true" /><span className={styles.slim} aria-hidden="true" />
        </div>
        <div className={styles.sheet}>
          <span aria-hidden="true" className="h-1 w-10 self-center rounded-full bg-line" />
          <p className="text-start text-sm font-bold text-lime"><bdi dir="ltr">{t('welcomeSlogan')}</bdi></p>
          <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold leading-snug outline-none">{t('welcomeLine')}</h1>
          <Button size="lg" block className={styles.pill} onClick={() => act('start')}><KoPlay aria-hidden="true" />{t('welcomeStart')}</Button>
          <Link href={welcomeAction('login')} className="flex min-h-14 items-center justify-center rounded-full px-5 font-bold">{t('welcomeLogin')}</Link>
        </div>
      </> : <>
        <div className="flex flex-1 flex-col gap-6 px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-[max(1.5rem,var(--safe-top))]">
        <div className="flex flex-wrap items-center justify-between gap-3"><AuthLogo /><LanguageSwitch compact /></div>
        <Button variant="ghost" className="self-start" onClick={() => window.history.back()}><ChevronLeft aria-hidden="true" className="rtl:rotate-180" />{t('welcomeBack')}</Button>
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold outline-none">{t(step === 2 ? 'welcomeWho' : 'welcomeCode')}</h1>
        {step === 2 ? <>
          <p className="text-muted">{t('welcomeChoose')}</p>
          <div role="radiogroup" aria-label={t('welcomeWho')} className="space-y-3">
            <WelcomeRoleCard player selected={role === 'player'} title={t('welcomePlayer')} description={t('welcomePlayerHint')} onClick={() => setRole('player')} onSelect={setRole} />
            <WelcomeRoleCard selected={role === 'captain'} title={t('welcomeCaptain')} description={t('welcomeCaptainHint')} onClick={() => setRole('captain')} onSelect={setRole} />
          </div>
          <div className="mt-auto space-y-3 pt-6">
            <Button size="lg" block className={styles.pill} onClick={() => act(role)}><KoPlay aria-hidden="true" />{t('continue')}</Button>
            <p className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted">{t('welcomeAccount')}<Link href={welcomeAction('login')} className="inline-flex min-h-12 items-center font-bold text-lime">{t('welcomeLogin')}</Link></p>
          </div>
        </> : <form className="space-y-6" onSubmit={event => {
          event.preventDefault();
          const destination = inviteDestination(code);
          if (destination) window.location.assign(destination);
          else setInvalid(true);
        }}>
          <TextField label={t('welcomeCodeLabel')} value={code} autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={event => { setCode(event.target.value); setInvalid(false); }} error={invalid ? t('welcomeInvalidCode') : undefined} />
          <Button type="submit" size="lg" block className={styles.pill}><KoPlay aria-hidden="true" />{t('continue')}</Button>
          <p className="text-sm text-muted">{t('welcomeCodeHint')}</p>
        </form>}
        </div>
      </>}
    </div>
  </main>;
}

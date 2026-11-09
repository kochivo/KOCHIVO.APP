'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { supabaseBrowser } from '@/core/supabase/browser';
import { Button } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { injuries } from '../brief';
import { loadCandidates } from '../data/load-candidates';
import { saveGenerated } from '../data/save-generated';
import { initialBrief, useGenerator, alternativesFor } from '../hooks/use-generator';
import type { IntakeDefaults } from '../hooks/use-generator';
import type { Candidate } from '../pick';
import { messages } from '../messages';
import { BriefSheet } from './brief-sheet';
import { GeneratedWeek } from './generated-week';
import { SwapSheet } from './swap-sheet';

export function GenerateButton({ playerId, playerName, intake, profileError = false, seed = 0, candidates: supplied }: {
  playerId?: string; playerName?: string; intake?: IntakeDefaults | null; profileError?: boolean; seed?: number; candidates?: readonly Candidate[];
}) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<readonly Candidate[] | null>(supplied ?? null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [slot, setSlot] = useState<{ weekday: number; position: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const locked = useRef(false);
  const savedId = useRef<string | undefined>(undefined);
  const state = useGenerator(initialBrief(intake, seed, playerId), candidates ?? []);
  const profileWarning = !!intake?.injuries?.some(injury => injury !== 'none' && !injuries.some(supported => supported === injury));
  useEffect(() => {
    if (!open || profileError || candidates !== null) return;
    let current = true;
    loadCandidates(supabaseBrowser()).then(result => {
      if (!current) return;
      if (result.error) setLoadError(true);
      else { setCandidates(result.data); setLoadError(false); }
    }).catch(() => { if (current) setLoadError(true); });
    return () => { current = false; };
  }, [open, candidates, attempt, profileError]);
  async function save(mode: 'assign' | 'template' | 'edit') {
    if (!state.program || locked.current) return;
    locked.current = true; setSaving(true); setSaveError('');
    try {
      const result = await saveGenerated(state.program, t('title'), mode, savedId.current);
      if (result.error !== undefined) { savedId.current = result.programId; setSaveError(result.error); return; }
      savedId.current = undefined; state.edit();
      router.push(`/captain/programs/${result.data}`);
      router.refresh(); setOpen(false);
    } catch { setSaveError(t('saveError')); }
    finally { locked.current = false; setSaving(false); }
  }
  function regenerate(keep: boolean) {
    state.regenerate(keep); setConfirm(false); setSaveError('');
  }
  return <>
    <Button id="generator-entry" variant="secondary" className="min-h-12" onClick={() => setOpen(true)}>
      <Sparkles aria-hidden className="size-5" />{t('entry')}
    </Button>
    {open && <ResponsiveDialog modal fallbackId="generator-entry" openerId="generator-entry"
      onDismiss={() => { if (!locked.current) { setOpen(false); setConfirm(false); setSlot(null); } }}
      aria-labelledby="generator-heading" dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-card border border-line bg-surface p-5 text-ink sm:p-6">
      {profileError ? <div className="space-y-4">
        <h2 id="generator-heading" className="text-xl font-bold">{t('brief')}</h2>
        <p role="alert" className="text-danger">{t('profileLoadError')}</p>
        <Button variant="secondary" className="min-h-12" onClick={() => router.refresh()}>{t('retry')}</Button>
        <Button variant="ghost" className="min-h-12" onClick={() => setOpen(false)}>{t('close')}</Button>
      </div> : candidates === null || candidates.length === 0 ? <div className="space-y-4">
        <h2 id="generator-heading" className="text-xl font-bold">{t('brief')}</h2>
        {loadError ? <p role="alert" className="text-danger">{t('loadError')}</p> :
          <p role="status">{t(candidates === null ? 'loading' : 'empty')}</p>}
        {(loadError || candidates?.length === 0) && <Button variant="secondary" className="min-h-12"
          onClick={() => { setCandidates(null); setLoadError(false); setAttempt(value => value + 1); }}>{t('retry')}</Button>}
        <Button variant="ghost" className="min-h-12" onClick={() => setOpen(false)}>{t('close')}</Button>
      </div> : !state.program ? <div className="space-y-4">
        <BriefSheet brief={state.brief} playerName={playerName} profileWarning={profileWarning} onChange={state.setBrief}
          onGenerate={state.generate} onClose={() => setOpen(false)} />
        {state.error && <p role="alert" className="text-danger">{t('unfilled')}</p>}
      </div> : <fieldset disabled={saving} className="min-w-0 space-y-5">
        <h2 id="generator-heading" tabIndex={-1} className="text-2xl font-bold">{t('week')}</h2>
        {playerName && <p><bdi>{playerName}</bdi></p>}
        <p className="text-sm text-muted">{t('draftNotice')}</p>
        {profileWarning && <p className="text-sm text-muted">{t('profileWarning')}</p>}
        <GeneratedWeek program={state.program} onSwap={(weekday, position) => setSlot({ weekday, position })} />
        {state.error && <p role="alert" className="text-danger">{t('unfilled')}</p>}
        {saveError && <p role="alert" className="text-danger">{saveError}</p>}
        {saving && <p role="status">{t('saving')}</p>}
        {confirm ? <div role="group" aria-label={t('regenerate')} className="glass-strong space-y-3 rounded-card p-4">
          <p>{t('regeneratePrompt')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-12" onClick={() => regenerate(true)}>{t('keepSwaps')}</Button>
            <Button variant="secondary" className="min-h-12" onClick={() => regenerate(false)}>{t('discardSwaps')}</Button>
            <Button variant="ghost" className="min-h-12" onClick={() => setConfirm(false)}>{t('cancel')}</Button>
          </div>
        </div> : <Button variant="secondary" className="min-h-12" onClick={() => state.swaps.length ? setConfirm(true) : regenerate(false)}>{t('regenerate')}</Button>}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-12" disabled={confirm} onClick={() => void save(profileWarning ? 'edit' : playerId ? 'assign' : 'template')}>
            {t(profileWarning ? 'edit' : playerId ? 'assign' : 'template', { name: playerName || t('player') })}
          </Button>
          {!profileWarning && <Button variant="ghost" className="min-h-12" disabled={confirm} onClick={() => void save('edit')}>{t('edit')}</Button>}
          <Button variant="ghost" className="min-h-12" onClick={() => { state.edit(); setConfirm(false); setSaveError(''); }}>{t('back')}</Button>
          <Button variant="ghost" className="min-h-12" onClick={() => { setOpen(false); setConfirm(false); }}>{t('close')}</Button>
        </div>
        {slot && <SwapSheet alternatives={alternativesFor(state.program, slot.weekday, slot.position, candidates)}
          onClose={() => setSlot(null)} onSelect={id => { state.swap(slot.weekday, slot.position, id); setSlot(null); }} />}
      </fieldset>}
    </ResponsiveDialog>}
  </>;
}

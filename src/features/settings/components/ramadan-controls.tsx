'use client';
import { useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/toast';
import { ramadanSettingsRange } from '@/lib/ramadan-calendar';
import type { loadRamadanTeam } from '../data/ramadan';
import { messages } from '../ramadan/messages';
type Team = Awaited<ReturnType<typeof loadRamadanTeam>>;
export function RamadanControls({ initial, today, save }: { initial: Team; today: string; save: (next: Team) => Promise<boolean> }) {
  const t = useT(messages), [draft, setDraft] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const lock = useRef(false);
  const toast = useToast();
  const prefs = draft.preferences;
  const range = ramadanSettingsRange(today);
  async function apply() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try {
      if (!await save(draft)) throw new Error('Save failed');
      toast.success({ title: t('saved'), detail: t('detail'), icon: 'check' });
    } catch { setError(true); } finally { lock.current = false; setBusy(false); }
  }
  return <div className="space-y-card-gap" aria-busy={busy}>
    <label className="flex min-h-12 cursor-pointer items-center gap-inline"><input type="checkbox" checked={prefs.ramadan_mode}
      onChange={e => setDraft({ ...draft, preferences: { ...prefs, ramadan_mode: e.target.checked } })} />{t('enable')}</label>
    <p className="text-row text-muted">{t('autoOff')}</p>
    {range && <p className="text-xs text-muted"><bdi>{t('dates', range)}</bdi></p>}
    <fieldset disabled={busy} className="space-y-stack"><legend>{t('training')}</legend>
      <div className="flex flex-wrap gap-inline">{(['before_iftar_1h','after_iftar_2h','after_taraweeh','before_suhoor'] as const).map(value =>
        <Button key={value} variant="secondary" aria-pressed={prefs.ramadan_training === value} className="aria-pressed:border-lime aria-pressed:text-lime"
          onClick={() => setDraft({ ...draft, preferences: { ...prefs, ramadan_training: value } })}>{t(value)}</Button>)}</div>
    </fieldset>
    <fieldset disabled={busy}><legend>{t('intensity')}</legend><div className="flex flex-wrap gap-inline">{(['same','lighter_20','maintenance'] as const).map(value =>
      <Button key={value} variant="secondary" aria-pressed={prefs.ramadan_intensity === value} className="aria-pressed:border-lime aria-pressed:text-lime"
        onClick={() => setDraft({ ...draft, preferences: { ...prefs, ramadan_intensity: value } })}>{t(value)}</Button>)}</div></fieldset>
    <p className="recessed rounded-control p-stack text-row">{t('meals')}</p>
    <label className="block space-y-inline">{t('water')}<input type="number" min={1000} max={6000} step={125} value={prefs.ramadan_water_ml}
      className="min-h-12 w-full rounded-control border border-line bg-surface px-stack" onChange={e => setDraft({ ...draft, preferences: { ...prefs, ramadan_water_ml: e.target.valueAsNumber } })} /></label>
    <fieldset disabled={busy}><legend>{t('exempt')}</legend>{draft.players.length ? draft.players.map(player =>
      <label key={player.id} className="flex min-h-12 cursor-pointer items-center gap-inline"><input type="checkbox" checked={draft.exempt.includes(player.id)} onChange={e =>
        setDraft({ ...draft, exempt: e.target.checked ? [...draft.exempt, player.id] : draft.exempt.filter(id => id !== player.id) })} /><bdi>{player.name}</bdi></label>) : <p className="text-muted">{t('empty')}</p>}</fieldset>
    {error && <p role="alert" className="text-sm text-danger">{t('error')}</p>}
    <Button disabled={busy || !Number.isFinite(prefs.ramadan_water_ml) || prefs.ramadan_water_ml < 1000 || prefs.ramadan_water_ml > 6000} onClick={() => void apply()} block>{t('apply', { n: draft.players.length - draft.exempt.length })}</Button>
  </div>;
}

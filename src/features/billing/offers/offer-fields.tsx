'use client';
import { useT } from '@/core/i18n/client';
import { TextField } from '@/ui/text-field';
import { messages } from './messages';
import type { OfferDraft } from './offer-form';
import type { Catalog } from '../tiers/types';

export function OfferFields({ draft, onChange, catalog }: { draft: OfferDraft; onChange: (draft: OfferDraft) => void; catalog: Catalog }) {
  const t = useT(messages);
  const patch = (value: Partial<OfferDraft>) => onChange({ ...draft, ...value });
  const chip = 'min-h-12 rounded-full border border-dashed border-line px-3.5 text-[12.5px] text-muted aria-pressed:border-lime aria-pressed:bg-lime-soft aria-pressed:text-lime';
  const selected = draft.scope === 'tiers' ? draft.tier_ids : draft.package_ids;
  const options = draft.scope === 'tiers' ? catalog.tiers : catalog.packages;
  return <>
    <TextField label={t('name')} value={draft.name} maxLength={40} required onChange={event => patch({ name: event.target.value })} />
    <fieldset><legend className="mb-2 text-xs text-faint">{t('kind')}</legend><div className="grid gap-2 min-[761px]:grid-cols-3">
      {(['percent', 'amount', 'bonus_days'] as const).map(kind => <button type="button" key={kind} aria-pressed={draft.kind === kind} onClick={() => patch({ kind, value: kind === 'bonus_days' ? 30 : kind === 'amount' ? 500 : 20 })}
        className="min-h-20 rounded-2xl border border-line-soft p-3.5 text-[12.5px] text-muted aria-pressed:border-lime aria-pressed:bg-lime-soft aria-pressed:text-lime">
        <b className="mb-1 block font-display text-lg text-ink">{t(kind === 'percent' ? 'kindPercent' : kind === 'amount' ? 'kindAmount' : 'kindGift')}</b>{t(kind)}</button>)}
    </div></fieldset>
    <TextField label={t(draft.kind === 'bonus_days' ? 'giftValue' : 'value')} type="number" value={draft.value || ''} required min={draft.kind === 'percent' ? 1 : 0.01} step={draft.kind === 'bonus_days' ? 1 : 'any'} max={draft.kind === 'percent' ? 90 : draft.kind === 'bonus_days' ? 365 : undefined} onChange={event => patch({ value: Number(event.target.value) })} />
    <fieldset><legend className="mb-2 text-xs text-faint">{t('scope')}</legend><div className="flex flex-wrap gap-2">
      {(['all', 'packages', 'tiers'] as const).map(scope => <button type="button" key={scope} className={chip} aria-pressed={draft.scope === scope} onClick={() => patch({ scope })}>{t(scope)}</button>)}
    </div>
      {draft.scope !== 'all' && <div className="mt-2 flex flex-wrap gap-2">{options.length ? options.map(item => <label key={item.id} className="flex min-h-12 items-center gap-2 rounded-control border border-line px-3 text-xs">
        <input type="checkbox" className="size-5 accent-lime" checked={selected.includes(item.id)} onChange={() => patch({ [draft.scope === 'tiers' ? 'tier_ids' : 'package_ids']: selected.includes(item.id) ? selected.filter(id => id !== item.id) : [...selected, item.id] })} />{item.name}
      </label>) : <p className="text-xs text-faint">{t('noSelection')}</p>}</div>}
    </fieldset>
    <fieldset><legend className="mb-2 text-xs text-faint">{t('dates')}</legend><div className="grid gap-3 sm:grid-cols-2">
      <TextField label={t('start')} type="datetime-local" className="[color-scheme:dark]" required value={draft.starts} onChange={event => patch({ starts: event.target.value })} />
      <TextField label={t('end')} type="datetime-local" className="[color-scheme:dark]" required value={draft.ends} onChange={event => patch({ ends: event.target.value })} />
    </div></fieldset>
    <fieldset><legend className="mb-2 text-xs text-faint">{t('audience')}</legend>
      {(['for_new', 'for_renewals', 'limited'] as const).map(key => <label key={key} className="flex min-h-12 flex-wrap items-center gap-2.5 border-t border-line-soft py-2 text-[13px] first:border-0">
        <input type="checkbox" className="size-6 accent-lime" checked={draft[key]} onChange={event => patch({ [key]: event.target.checked })} />{t(key === 'for_new' ? 'newPlayers' : key === 'for_renewals' ? 'renewals' : 'limited')}
        {key === 'limited' && draft.limited && <input aria-label={t('limit')} type="number" min={1} step={1} className="min-h-12 w-24 rounded-control border border-line bg-surface px-3" value={draft.limit || ''} onChange={event => patch({ limit: Number(event.target.value) })} />}
      </label>)}
    </fieldset>
  </>;
}

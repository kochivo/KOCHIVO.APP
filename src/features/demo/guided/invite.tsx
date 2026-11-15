import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/text-field';
import { SwitchTrack } from '@/ui/switch-track';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function Invite({ state, dispatch, act }: PaneProps) {
  const t = useT(guidedMessages);
  if (state.invite) return <GlassCard className="grid max-w-xl gap-stack p-card text-center"><h3 className="text-title">{t('inviteSuccess', { name: state.name })}</h3><p className="text-sm text-muted">{t('packages').split('|')[state.pkg]} · {t('packageDetails').split('|')[state.pkg]}</p>
    <p className="text-xs text-muted">{t('assessments')} · {Number(state.initial) + Number(state.photos)}{state.gate && <> · {t('gate')}</>}</p>
    <div className="recessed flex flex-wrap items-center justify-between gap-inline rounded-control p-stack"><bdi>{t('inviteUrl')}</bdi><Button variant="secondary" onClick={() => act('copy')}>{t('copy')}</Button></div>
    <Button onClick={() => act('wa')}>{t('whatsapp')}</Button><Button variant="secondary" onClick={() => act('again')}>{t('again')}</Button>
  </GlassCard>;
  return <form data-demo-target="addform" className="glass grid max-w-2xl gap-card-gap rounded-card p-card" onSubmit={e => { e.preventDefault(); act('invite', state.name.trim() || t('defaultName')); }}>
    <TextField label={t('playerName')} value={state.name} placeholder={t('defaultName')} onChange={e => dispatch({ type: 'patch', patch: { name: e.target.value } })} />
    <fieldset className="grid gap-stack"><legend className="text-sm">{t('package')}</legend><div className="grid gap-inline sm:grid-cols-3">{t('packages').split('|').map((label, pkg) => <Button key={label} variant="secondary" className="flex-col whitespace-normal text-start" aria-pressed={state.pkg === pkg} onClick={() => dispatch({ type: 'patch', patch: { pkg } })}><b>{label}</b><small className="text-xs text-muted">{t('packageDetails').split('|')[pkg]}</small></Button>)}</div></fieldset>
    <fieldset className="grid gap-stack"><legend className="text-sm">{t('assessments')}</legend>{(['initial', 'photos', 'gate'] as const).map((key, i) => <Button key={key} variant="secondary" className="justify-between" role="switch" aria-checked={state[key]} onClick={() => dispatch({ type: 'patch', patch: { [key]: !state[key] } })}><span className="text-start"><b>{t((['initial', 'photosTitle', 'gate'] as const)[i] ?? 'initial')}</b><small className="block text-xs text-muted">{t((['initialDetail', 'photosTitle', 'gateDetail'] as const)[i] ?? 'initialDetail')}</small></span><SwitchTrack on={state[key]} /></Button>)}</fieldset>
    <Button type="submit">{t('makeLink')}</Button>
  </form>;
}

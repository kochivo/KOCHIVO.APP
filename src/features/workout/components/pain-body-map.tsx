'use client';
import { useT } from '@/core/i18n/client';
import { painAreas } from '@/core/offline/pain-tables';
import type { PainArea } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { messages } from '../pain/messages';

const positions: Record<PainArea, [number, number]> = {
  neck: [150, 35], shoulder_l: [194, 76], shoulder_r: [106, 76], elbow_l: [218, 132], elbow_r: [82, 132],
  wrist_l: [240, 190], wrist_r: [60, 190], upper_back: [150, 120], lower_back: [150, 172], chest: [150, 120],
  hip_l: [180, 224], hip_r: [120, 224], knee_l: [180, 280], knee_r: [120, 280], ankle_l: [180, 338], ankle_r: [120, 338], other: [150, 338],
};
export function PainBodyMap({ area, view, onChange, compact = false }: { area: PainArea | null; view: 'front' | 'back'; onChange: (area: PainArea) => void; compact?: boolean }) {
  const t = useT(messages);
  const visible = painAreas.filter(key => key !== 'other' && (view === 'front' ? key !== 'upper_back' && key !== 'lower_back' : key !== 'chest'));
  if (compact) {
    const quick = ['knee_r', 'knee_l', view === 'front' ? 'hip_r' : 'lower_back', 'other'] as const;
    const point = area && area !== 'other' ? positions[area] : null;
    return <div className="grid grid-cols-2 items-center gap-inline">
      <svg aria-hidden viewBox="0 0 300 370" className="mx-auto h-48 max-w-full">
        <g fill="currentColor" className="text-surface-raised" stroke="var(--color-line)" strokeWidth="2">
          <circle cx="150" cy="32" r="23" /><rect x="112" y="60" width="76" height="140" rx="22" />
          <rect x="84" y="64" width="22" height="138" rx="11" /><rect x="194" y="64" width="22" height="138" rx="11" />
          <rect x="113" y="207" width="34" height="154" rx="17" /><rect x="153" y="207" width="34" height="154" rx="17" />
        </g>
        {point && <circle cx={area?.endsWith('_r') ? 130 : area?.endsWith('_l') ? 170 : point[0]} cy={point[1]} r="15"
          strokeWidth="3" className="fill-danger-soft stroke-danger" />}
      </svg>
      <div className="grid min-w-0 gap-inline">
        {quick.map(key => <Button key={key} variant="secondary" aria-pressed={area === key}
          className={area === key ? 'justify-start border-danger bg-danger-soft px-inline text-xs text-danger' : 'justify-start px-inline text-xs'}
          onClick={() => onChange(key)}>{t(key)}</Button>)}
        <select aria-label={t('where')} value={area && visible.includes(area) ? area : ''}
          onChange={event => { const next = visible.find(key => key === event.target.value); if (next) onChange(next); }}
          className="min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-inline text-xs">
          <option value="" disabled>{t('where')}</option>
          {visible.map(key => <option key={key} value={key}>{t(key)}</option>)}
        </select>
      </div>
    </div>;
  }
  return <div className="space-y-stack">
    <svg viewBox="0 0 300 370" className="mx-auto w-[300px] max-w-full text-muted" role="group" aria-label={t('where')}>
      <g fill="currentColor" className="text-surface-raised" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="150" cy="25" r="18" /><path d="M116 55H184L194 204H106Z M116 62L48 198L65 209L132 75 M184 62L252 198L235 209L168 75 M108 205H147L140 354H112Z M153 205H192L188 354H160Z" />
      </g>
      {visible.map(key => <foreignObject key={key} x={positions[key][0] - 24} y={positions[key][1] - 24} width="48" height="48">
        <button type="button" aria-label={t(key)} aria-pressed={area === key} onClick={() => onChange(key)}
          className="press flex min-h-12 w-12 cursor-pointer items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-lime">
          <span aria-hidden className={area === key ? 'size-5 rounded-full border border-danger bg-danger-soft' : 'size-3 rounded-full border border-muted bg-surface-raised'} />
        </button>
      </foreignObject>)}
    </svg>
    <div className="flex items-center justify-center gap-inline"><Button variant="secondary" aria-pressed={area === 'other'} onClick={() => onChange('other')}>{t('other')}</Button>
      {area && <span className="text-sm text-danger">{t(area)}</span>}</div>
  </div>;
}

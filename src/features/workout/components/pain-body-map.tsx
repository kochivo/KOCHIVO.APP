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
export function PainBodyMap({ area, view, onChange }: { area: PainArea | null; view: 'front' | 'back'; onChange: (area: PainArea) => void }) {
  const t = useT(messages);
  const visible = painAreas.filter(key => key !== 'other' && (view === 'front' ? key !== 'upper_back' && key !== 'lower_back' : key !== 'chest'));
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

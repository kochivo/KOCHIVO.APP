'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { clickableClass } from '@/ui/button';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useId } from 'react';
import { useT } from '@/core/i18n/client';
import { internationalEnabled } from '@/lib/international-enabled';
import { deviceTimezone } from '@/lib/timezone';
import { SwitchTrack } from '@/ui';
import { messages } from '../messages';
import { timezones } from '../schema';

export function TimezoneFields({ timezone, auto, onChange }: { timezone: string; auto: boolean;
  onChange: (timezone: string, auto: boolean) => void }) {
  const t = useT(messages);
  const id = useId();
  if (!internationalEnabled()) return null;
  return <div className="space-y-2">
    <button type="button" role="switch" aria-checked={auto} onClick={() => onChange(auto ? timezone : deviceTimezone(), !auto)}
      className={captainWorkspaceEnabled() ? `${clickableClass} flex min-h-12 w-full items-center justify-between gap-4 text-start` : "flex min-h-12 w-full items-center justify-between gap-4 text-start"}>
      <span>{t('automaticTimezone')}</span><SwitchTrack on={auto} />
    </button>
    <label htmlFor={id} className="text-sm font-semibold">{t('timezone')}</label>
    <select id={id} value={timezone} disabled={auto} onChange={e => onChange(e.target.value, false)}
      className={captainWorkspaceEnabled() ? `${editableFieldClass} min-h-12 w-full rounded-control border border-line bg-surface px-4 py-3 text-start disabled:opacity-50` : "min-h-12 w-full rounded-control border border-line bg-surface px-4 py-3 text-start disabled:opacity-50"}>
      {Array.from(new Set([timezone, ...timezones])).map(zone => <option key={zone} value={zone}>{zone}</option>)}
    </select>
  </div>;
}

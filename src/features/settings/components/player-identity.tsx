'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr } from '@/lib/dates';
import { savePlayerWithAvatar } from '../data/captain-avatar';
import type { SettingsProfile } from '../schema';
import { messages } from '../player-messages';
import { messages as profileMessages } from '../messages';
import { AvatarPicker } from './avatar-picker';
import { useProfileWrite } from '../hooks/use-profile-write';

export function PlayerIdentity({ profile, captainName, accessUntil, plan, onSave }: {
  profile: SettingsProfile; captainName?: string; accessUntil?: string; plan?: string; onSave: (profile: SettingsProfile) => void;
}) {
  const t = useT(messages);
  const profileT = useT(profileMessages);
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const writer = useProfileWrite();
  const pending = writer.pending;
  const [error, setError] = useState(false);
  const upload = async (next: File | null) => {
    if (!next) return;
    await writer.run(async () => {
      setFile(next); setError(false);
      try {
        const result = await savePlayerWithAvatar({ full_name: profile.full_name, phone: profile.phone ?? '', avatar_path: profile.avatar_path }, next, profileT);
        if (!result.data) throw new Error('Avatar save failed');
        onSave(result.data); setFile(null);
      } catch { setFile(null); setError(true); }
    });
  };
  return <section aria-label={t('identity')} aria-busy={pending} className="rounded-[28px] border border-line-soft bg-surface p-[18px]">
    <div className="flex items-center gap-3.5">
      <div className="shrink-0 [&_.glass]:border-0 [&_.glass]:bg-lime [&_.glass]:text-on-lime [&_.glass]:shadow-none [&_button]:start-0! [&_button]:end-0! [&_button]:top-0! [&_button]:bottom-0! [&_button]:size-16 [&_button]:bg-transparent! [&_button_svg]:sr-only [&_span[aria-hidden]]:text-[26px] [&_span[aria-hidden]]:font-black">
        <AvatarPicker name={profile.full_name} path={profile.avatar_path} file={file} pending={pending} onChange={next => void upload(next)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1"><b className="break-words text-xl">{profile.full_name}</b>
        {captainName && <span className="text-xs text-muted">{plan ? t('coachPlan', { name: captainName, plan }) : t('coach', { name: captainName })}</span>}
        {accessUntil && <span className="text-xs text-muted">{t('until')} <b dir="ltr" className="font-[family-name:var(--font-manrope)] text-ink"><time dateTime={accessUntil}>{formatDateAr(accessUntil, { day: 'numeric', month: 'short' }, locale)}</time></b></span>}
      </div>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{t('saveError')}</p>}
  </section>;
}

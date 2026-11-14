'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { captainAvatarUrl } from '../data/captain-avatar';
import { messages } from '../messages';
import type { SettingsProfile } from '../schema';

export function WorkspaceAvatar({ profile }: { profile: SettingsProfile }) {
  const t = useT(messages), path = profile.avatar_path;
  const [image, setImage] = useState({ path, url: '', error: false, loaded: false });
  useEffect(() => {
    let active = true;
    void (path ? captainAvatarUrl(path) : Promise.resolve('')).then(url => {
      if (active) setImage({ path, url, error: false, loaded: true });
    }).catch(() => { if (active) setImage({ path, url: '', error: true, loaded: true }); });
    return () => { active = false; };
  }, [path]);
  const current = image.path === path;
  return <span className="shrink-0">
    {current && image.url ? <Image src={image.url} alt="" width={52} height={52} unoptimized className="size-13 rounded-control object-cover"
      onError={() => setImage({ path, url: '', error: true, loaded: true })} /> :
      <span aria-hidden className="glass grid size-13 place-items-center rounded-control font-display text-xl text-lime">{profile.full_name.trim().slice(0, 1)}</span>}
    {path && (!current || !image.loaded) && <span role="status" className="sr-only">{t('loadingPhoto')}</span>}
    {current && image.error && <span role="alert" className="text-xs text-danger">{t('photoFailed')}</span>}
  </span>;
}

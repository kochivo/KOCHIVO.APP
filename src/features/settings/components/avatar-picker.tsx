'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { useT } from '@/core/i18n/client';
import { captainAvatarUrl } from '../data/captain-avatar';
import { messages } from '../messages';
import { Button } from '@/ui/button';

export function AvatarPicker({ name, path, file, pending, onChange }: {
  name: string; path?: string | null; file: File | null; pending: boolean; onChange: (file: File | null) => void;
}) {
  const t = useT(messages);
  const upload = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<{ path?: string | null; url: string; error: string }>({ url: '', error: '' });
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const loading = Boolean(path) && avatar.path !== path;
  const url = avatar.path === path ? avatar.url : '';
  useEffect(() => {
    let active = true;
    void (path ? captainAvatarUrl(path) : Promise.resolve('')).then(value => {
      if (active) setAvatar({ path, url: value, error: '' });
    }).catch(() => { if (active) setAvatar({ path, url: '', error: t('photoFailed') }); });
    return () => { active = false; };
  }, [path, t]);
  useEffect(() => {
    let active = true;
    let value = '';
    void Promise.resolve().then(() => {
      if (!active) return;
      value = file ? URL.createObjectURL(file) : '';
      setPreview(value);
    });
    if (!file && upload.current) upload.current.value = '';
    return () => { active = false; if (value) URL.revokeObjectURL(value); };
  }, [file]);
  return <div>
    <div className="relative size-16 shrink-0">
      {preview || url ? <Image src={preview || url} alt="" width={64} height={64} unoptimized
        onError={() => { setAvatar({ path, url: '', error: '' }); setPreview(''); setError(t('photoFailed')); }} className="size-16 rounded-full object-cover" /> :
        <span aria-hidden className="glass flex size-16 items-center justify-center rounded-full text-2xl font-bold">{name.trim().slice(0, 1)}</span>}
      <Button type="button" disabled={pending || loading} aria-label={t('uploadAvatar')} onClick={() => upload.current?.click()}
        variant={'secondary'} block={false} className={"absolute -end-4 -bottom-3 flex min-h-12 min-w-12 items-center justify-center"}>
        <Camera aria-hidden className="size-5" />
      </Button>
      <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label={t('uploadAvatar')}
        onChange={event => { setError(''); onChange(event.target.files?.[0] ?? null); }} />
    </div>
    {loading && <p role="status" className="mt-card-gap text-sm text-muted">{t('loadingPhoto')}</p>}
    {(error || avatar.error) && <p role="alert" className="mt-card-gap text-sm text-danger">{error || avatar.error}</p>}
  </div>;
}

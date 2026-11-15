'use client';
import { AtSign, Camera, Music2, Phone, Users, Video } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { TextField } from '@/ui';
import { messages } from '../messages';
import { socialKeys } from '../schema';
import type { SocialKey } from '../schema';

const icons = { whatsapp: Phone, instagram: Camera, tiktok: Music2, facebook: Users, youtube: Video, x: AtSign };

export function SocialLinksFields({ value, errors, onChange }: {
  value: Partial<Record<SocialKey, string>>; errors: Record<string, string>;
  onChange: (key: SocialKey, value: string) => void;
}) {
  const t = useT(messages);
  return <fieldset className="space-y-card-gap">
    <legend className="text-sm text-muted">{t('socialLinks')}</legend>
    <div className="grid grid-cols-1 gap-card-gap md:grid-cols-2">
      {socialKeys.map(key => {
        const Icon = icons[key];
        return <div key={key} className="relative">
          <Icon aria-hidden className="absolute end-3 top-11 size-5 text-muted" />
          <TextField label={t(key)} value={value[key] ?? ''} dir="ltr" maxLength={200}
            onChange={event => onChange(key, event.target.value)} error={errors[`social.${key}`]}
            className="bg-surface pe-touch focus-visible:ring-2 focus-visible:ring-lime" />
        </div>;
      })}
    </div>
  </fieldset>;
}

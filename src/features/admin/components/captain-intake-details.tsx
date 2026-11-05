import { useT } from '@/core/i18n/client';
import type { Json } from '@/types/database';
import { messages } from '../approvals/messages';

const choices = {
  current_tool: ['whatsapp_excel', 'other_app', 'just_starting'],
  main_challenge: ['time_on_tables', 'tracking_progress', 'unprofessional_look'],
  players_range: ['1-10', '11-50', '50+'],
} as const;
type Answer = typeof choices[keyof typeof choices][number];

export function CaptainIntakeDetails({ whatsapp, instagram, intake }: {
  whatsapp?: string | null; instagram?: string | null; intake?: Json | null;
}) {
  const t = useT(messages);
  const phone = whatsapp?.replace(/^\+/, '');
  const answers = intake && typeof intake === 'object' && !Array.isArray(intake) ? intake : null;
  return <div className="space-y-2 text-sm">
    {phone && /^\d{8,15}$/.test(phone) && <a className="flex min-h-12 items-center gap-2 text-lime" href={`https://wa.me/${phone}`}>
      <span>{t('whatsapp')}</span><bdi>{whatsapp}</bdi>
    </a>}
    {instagram && <p><span>{t('instagram')}</span> <bdi>{instagram}</bdi></p>}
    {answers ? <dl className="space-y-2">{(Object.keys(choices) as (keyof typeof choices)[]).map(key => {
      const value = answers[key];
      if (typeof value !== 'string' || !(choices[key] as readonly string[]).includes(value)) return null;
      return <div key={key}><dt className="text-muted">{t(key)}</dt><dd>{t(value as Answer)}</dd></div>;
    })}</dl> : <p className="text-muted">{t('missingIntake')}</p>}
  </div>;
}

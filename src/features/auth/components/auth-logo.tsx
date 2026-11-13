import Image from 'next/image';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function AuthLogo() {
  const t = useT(messages);
  return <div className="w-32 shrink-0">
    <Image src="/brand/logo-primary.png" alt={t('authBrand')} width={1374} height={387} fetchPriority="high" className="h-auto w-full [[data-theme=light]_&]:hidden" />
    <Image src="/brand/logo-primary-light.png" alt={t('authBrand')} width={1374} height={387} fetchPriority="high" className="hidden h-auto w-full [[data-theme=light]_&]:block" />
  </div>;
}

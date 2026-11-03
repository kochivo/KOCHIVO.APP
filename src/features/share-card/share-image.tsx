import { ImageResponse } from 'next/og';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { ogColors as colors } from './og-colors';
import { ogFont } from './data/og-font';
import { shareText } from './share-text';

export async function shareImage(locale: Locale, coach?: { full_name: string; avatar: string | null }) {
  const t = createT(messages, locale);
  const title = coach?.full_name || t('slogan');
  const font = await ogFont();
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%',
    flexDirection: 'column', justifyContent: 'center', padding: 72, gap: 28, color: colors.ink,
    background: `radial-gradient(ellipse at top, ${colors.glow}, ${colors.bg} 75%)`, fontFamily: 'Card' }}>
    <div style={{ display: 'flex', fontSize: 38, color: colors.lime, letterSpacing: 8 }}>{t('brand')}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
      {coach?.avatar &&
        // ImageResponse needs a native image to embed the public storage photo.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coach.avatar} alt="" width={180} height={180} style={{ borderRadius: 90, objectFit: 'cover' }} />}
      <div style={{ display: 'flex', fontSize: coach ? (title.length > 40 ? 42 : 58) : 68,
        maxWidth: 800, lineHeight: 1.35, wordBreak: 'break-word' }}>{shareText(title)}</div>
    </div>
    {coach && <div style={{ display: 'flex', fontSize: 30, color: colors.muted }}>{t('slogan')}</div>}
    <div style={{ display: 'flex', fontSize: 36, color: colors.muted }}>{shareText(t('arabicLine'))}</div>
  </div>, { width: 1200, height: 630, fonts: [{ name: 'Card', data: font, weight: 700, style: 'normal' }] });
}

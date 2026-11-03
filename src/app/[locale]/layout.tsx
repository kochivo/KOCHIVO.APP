import type { Metadata, Viewport } from 'next';
import { Alexandria, Changa, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { RegisterServiceWorker } from '@/core/pwa/register-sw';
import { glassBootScript } from '@/lib/glass-mode';
import { themeBootScript } from '@/lib/theme-mode';
import '../globals.css';
import { setRequestLocale } from '@/core/i18n/server';
import { LOCALES, localeDir, parseLocale } from '@/core/i18n/locale';
import { LocaleProvider } from '@/core/i18n/client';
import { MobileViewport } from '@/ui/mobile-viewport';
import { ToastProvider } from '@/ui/toast';
import { InAppBrowserWarning } from '@/ui/in-app-browser-warning';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const alexandria = Alexandria({ subsets: ['arabic'], variable: '--font-alexandria', display: 'swap' });
const changa = Changa({ subsets: ['arabic'], variable: '--font-changa', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://kochivo.site'),
  title: { default: 'KOCHIVO', template: '%s · KOCHIVO' },
  description: 'COACH BETTER',
  applicationName: 'KOCHIVO',
  appleWebApp: { capable: true, title: 'KOCHIVO', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/favicon-32.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#101418' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map(locale => ({ locale }));
}

export default async function RootLayout({ children, params }: {
  children: ReactNode; params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <html lang={locale} dir={localeDir(locale)} suppressHydrationWarning className={`${manrope.variable} ${alexandria.variable} ${changa.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript + ';' + glassBootScript }} /></head>
      <body className="min-h-dvh">
        <LocaleProvider locale={locale}>
          <ToastProvider><InAppBrowserWarning />{children}</ToastProvider>
          <MobileViewport />
          <RegisterServiceWorker />
        </LocaleProvider>
      </body>
    </html>
  );
}

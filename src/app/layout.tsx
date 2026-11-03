import type { Metadata, Viewport } from 'next';
import { Alexandria, Changa, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { RegisterServiceWorker } from '@/core/pwa/register-sw';
import './globals.css';

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
  themeColor: '#101418',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${manrope.variable} ${alexandria.variable} ${changa.variable}`}>
      <body className="min-h-dvh">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

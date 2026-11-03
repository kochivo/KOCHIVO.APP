import type { Metadata } from 'next';
import { setRequestLocale } from '@/core/i18n/server';
import { parseLocale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import {
  getContent, marketingMessages, SiteHeader, Hero, StatsStrip, HowItWorks, FeaturesGrid,
  PlayerSection, Pricing, Faq, FinalCta, SiteFooter,
} from '@/features/marketing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  const content = getContent(createT(marketingMessages, locale));
  return {
    title: content.seo.title,
    description: content.seo.description,
    openGraph: {
      title: content.seo.title,
      description: content.seo.description,
      locale: locale === 'ar' ? 'ar_EG' : 'en_GB',
      type: 'website',
      siteName: content.brand,
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(parseLocale((await params).locale));
  return <>
    <SiteHeader />
    <main>
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <FeaturesGrid />
      <PlayerSection />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
    <SiteFooter />
  </>;
}

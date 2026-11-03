import type { Metadata } from 'next';
import {
  content, SiteHeader, Hero, StatsStrip, HowItWorks, FeaturesGrid,
  PlayerSection, Pricing, Faq, FinalCta, SiteFooter,
} from '@/features/marketing';

export const metadata: Metadata = {
  title: content.seo.title,
  description: content.seo.description,
  openGraph: {
    title: content.seo.title,
    description: content.seo.description,
    locale: 'ar_EG',
    type: 'website',
    siteName: content.brand,
  },
};

export default function HomePage() {
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

import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrivacyPage, { generateMetadata as privacyMetadata } from '@/app/[locale]/privacy/page';
import TermsPage, { generateMetadata as termsMetadata } from '@/app/[locale]/terms/page';
import sitemap from '@/app/sitemap';
import { SiteFooter } from '../components/site-footer';

const request = vi.hoisted(() => ({ locale: 'ar', standard: false }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (key: string) => ({ value: key === 'kochivo.locale' ? request.locale : undefined }) }),
  headers: async () => new Headers({ 'accept-language': request.standard ? 'ar-SA' : 'ar-EG' }),
}));

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ''));
afterEach(() => { vi.unstubAllEnvs(); request.locale = 'ar'; request.standard = false; });

describe('public legal pages', () => {
  it.each([
    ['ar', false, 'سياسة الخصوصية', 'شروط الاستخدام', 'إحنا مين', 'الخدمة'],
    ['ar', true, 'سياسة الخصوصية', 'شروط الاستخدام', 'من نحن', 'الخدمة'],
    ['en', false, 'Privacy policy', 'Terms of use', 'Who we are', 'The service'],
  ] as const)('renders both routes in %s (standard: %s)', async (locale, standard, privacy, terms, firstPrivacy, firstTerms) => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    request.locale = locale; request.standard = standard;
    const props = { params: Promise.resolve({ locale }) };
    const headings = locale === 'en' ? [
      ['Who we are', 'What we collect', 'Why we use your data', 'Who sees your data', 'Service providers', 'Health data', 'Your rights', 'Cookies', 'Age', 'Law', 'Changes and contact'],
      ['The service', 'Not medical advice', 'Your account', 'Coaches', 'Payments between player and coach', 'Not allowed', 'Suspension', 'Your content', 'Liability', 'Changes', 'Law'],
    ] : standard ? [
      ['من نحن', 'البيانات التي نجمعها', 'لماذا نستخدم بياناتك', 'من يرى بياناتك', 'مقدّمو الخدمة', 'البيانات الصحية', 'حقوقك', 'ملفات تعريف الارتباط', 'العمر', 'القانون', 'التغييرات والتواصل'],
      ['الخدمة', 'ليست نصيحة طبية', 'حسابك', 'الكباتن', 'الدفع بين اللاعب والكابتن', 'الاستخدام الممنوع', 'تعليق الحساب', 'المحتوى الخاص بك', 'المسؤولية', 'التغييرات', 'القانون'],
    ] : [
      ['إحنا مين', 'البيانات اللي بنجمعها', 'بنستخدم البيانات ليه', 'مين بيشوف بياناتك', 'مقدّمي الخدمة', 'البيانات الصحية', 'حقوقك', 'ملفات تعريف الارتباط', 'السن', 'القانون', 'التغييرات والتواصل'],
      ['الخدمة', 'مش نصيحة طبية', 'حسابك', 'الكباتن', 'الدفع بين اللاعب والكابتن', 'الاستخدام الممنوع', 'تعليق الحساب', 'المحتوى بتاعك', 'المسؤولية', 'التغييرات', 'القانون'],
    ];
    for (const [page, metadata, title, first] of [
      [PrivacyPage, privacyMetadata, privacy, firstPrivacy],
      [TermsPage, termsMetadata, terms, firstTerms],
    ] as const) {
      const stream = await renderToReadableStream(await page(props));
      await stream.allReady;
      const html = await new Response(stream).text();
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(`>${title}</h1>`);
      expect(html.match(/<h2\b/g)).toHaveLength(11);
      expect(html).toContain(`>${first}</h2>`);
      expect([...html.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/g)].map(match => match[1]))
        .toEqual(headings[page === PrivacyPage ? 0 : 1]);
      expect(html).toContain('href="https://wa.me/');
      expect(html).toContain(locale === 'en' ? 'Last updated: 16 November 2026' : 'آخر تحديث: 16 نوفمبر 2026');
      if (page === PrivacyPage) expect(html).toContain(locale === 'en' ? 'which may use or review them' :
        standard ? 'وقد يستخدمها أو يراجعها' : 'وممكن يستخدمها أو يراجعها');
      expect(html).not.toMatch(/Supabase|Vercel|Resend|Sentry|Google|Gemini/i);
      const seo = await metadata(props);
      expect(seo.title).toContain(title);
      expect(seo.description).toBeTruthy();
    }
  });

  it.each(['ar', 'en'])('links the footer to %s legal routes and retains attribution', async locale => {
    request.locale = locale;
    const html = renderToStaticMarkup(await SiteFooter());
    expect(html).toContain(`href="/${locale}/privacy"`);
    expect(html).toContain(`href="/${locale}/terms"`);
    expect(html.match(/© Gym visual/g)).toHaveLength(1);
    expect(html).toContain('href="https://gymvisual.com/"');
  });

  it('includes both legal pages for both route locales in the sitemap', () => {
    const urls = sitemap().map(entry => entry.url);
    expect(urls).toEqual(expect.arrayContaining([
      'https://kochivo.site/ar/privacy', 'https://kochivo.site/en/privacy',
      'https://kochivo.site/ar/terms', 'https://kochivo.site/en/terms',
    ]));
  });
});

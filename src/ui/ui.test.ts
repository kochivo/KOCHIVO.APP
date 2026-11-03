import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { BottomNav, Chip, EmptyState, ErrorState, IconButton, LoadingState, ProgressBar, Segmented, SyncPill, TextField } from './index';

describe('UI primitives', () => {
  it.each([[-5, 0], [150, 100], [25, 25]])('clamps progress %s to %s', (value, expected) => {
    const html = renderToStaticMarkup(createElement(ProgressBar, { value, max: 100 }));
    expect(html).toContain(`aria-valuenow="${expected}"`);
  });

  it('handles zero max without invalid percentages', () => {
    expect(renderToStaticMarkup(createElement(ProgressBar, { value: 5, max: 0 }))).toContain('aria-valuenow="0"');
  });

  it.each([['synced', 'متزامن'], ['pending', 'محفوظ · 3'], ['offline', 'من غير نت']] as const)('renders %s sync state', (state, text) => {
    const html = renderToStaticMarkup(createElement(SyncPill, { state, pending: 3 }));
    expect(html).toContain(text);
    expect(html).toContain('role="status"');
  });

  it('links field errors and hints while preserving external descriptions', () => {
    const html = renderToStaticMarkup(createElement(TextField, {
      id: 'email', label: 'الإيميل', error: 'راجع الإيميل', hint: 'إيميلك', dir: 'ltr', 'aria-describedby': 'extra',
    }));
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="extra email-hint email-error"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain('dir="ltr"');
  });

  it('marks exactly one segmented option checked', () => {
    const html = renderToStaticMarkup(createElement(Segmented, {
      value: 'day', onChange: () => {}, 'aria-label': 'الفترة',
      options: [{ value: 'day', label: 'يوم' }, { value: 'week', label: 'أسبوع' }],
    }));
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain('role="radiogroup"');
  });

  it('marks only the active navigation item current', () => {
    const html = renderToStaticMarkup(createElement(BottomNav, { items: [
      { href: '/', label: 'الرئيسية', icon: Home, active: true },
      { href: '/workout', label: 'التمرين', icon: Home },
    ] }));
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it('renders chip and async states accessibly', () => {
    expect(renderToStaticMarkup(createElement(Chip, { pressed: true }, 'تمرين'))).toContain('aria-pressed="true"');
    expect(renderToStaticMarkup(createElement(LoadingState))).toContain('aria-busy="true"');
    expect(renderToStaticMarkup(createElement(LoadingState))).toContain('جاري التحميل');
    expect(renderToStaticMarkup(createElement(ErrorState, { message: 'حصلت مشكلة', retryLabel: 'جرّب تاني', onRetry: () => {} }))).toContain('حصلت مشكلة');
    expect(renderToStaticMarkup(createElement(EmptyState, { icon: Home, title: 'لسه مفيش', body: 'ابدأ دلوقتي' }))).toContain('لسه مفيش');
  });

  it('requires an accessible icon button label', () => {
    // @ts-expect-error Icon-only controls must have an accessible label.
    createElement(IconButton, {}, createElement(Home));
    expect(renderToStaticMarkup(createElement(IconButton, { 'aria-label': 'الرئيسية' }, createElement(Home, { 'aria-hidden': true })))).toContain('aria-label="الرئيسية"');
  });
});

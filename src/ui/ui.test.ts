import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { Stat } from './stat';
import { Button } from './button';
import { GlassCard } from './glass-card';
import { Stepper } from './stepper';
import { ResponsiveDialog } from './responsive-dialog';
import { RouteLoading } from './route-loading';
import { SwitchTrack } from './switch-track';
import Template from '../app/[locale]/template';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList } from './skeleton';
import { createToastQueue, ToastProvider } from './toast';
import { BottomNav, Chip, EmptyState, ErrorState, IconButton, LoadingState, ProgressBar, Segmented, SyncPill, TextField } from './index';

describe('UI primitives', () => {
  it('sizes buttons responsively and supports desktop block actions', () => {
    expect(renderToStaticMarkup(createElement(Button))).toContain('w-full md:w-auto');
    const block = renderToStaticMarkup(createElement(Button, { block: true }));
    expect(block).toContain('w-full');
    expect(block).not.toContain('md:w-auto');
    expect(renderToStaticMarkup(createElement(Button, { variant: 'ghost' }))).not.toContain('w-full');
  });
  it('renders display numbers with tabular spacing', () => {
    for (const size of ['md', 'lg'] as const) expect(renderToStaticMarkup(createElement(Stat, { size }, '125'))).toContain('tabular-nums');
  });
  it('offers responsive card padding', () => {
    expect(renderToStaticMarkup(createElement(GlassCard))).toContain('p-4 md:p-6');
    expect(renderToStaticMarkup(createElement(GlassCard, { padding: 'sm' }))).toContain('p-3 md:p-4');
    expect(renderToStaticMarkup(createElement(GlassCard))).not.toContain('hover-lift');
    expect(renderToStaticMarkup(createElement(GlassCard, { interactive: true }))).toContain('press hover-lift');
    expect(renderToStaticMarkup(createElement(GlassCard, { className: 'px-2 py-3' }))).not.toContain('md:p-6');
  });
  it('defines hover lift only for hover devices and removes reduced-motion translation', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@utility hover-lift[\s\S]*?@media \(hover: hover\)[\s\S]*?translate: 0 -\.25rem/);
    expect(css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))).toContain('.hover-lift:hover');
  });
  it('keeps gym sizing by default and offers compact controls with full touch targets', () => {
    const props = { label: 'Reps', value: 8, step: 1, onChange: () => {} };
    const gym = renderToStaticMarkup(createElement(Stepper, props));
    expect(gym).toContain('glass-strong');
    expect(gym.match(/size-19/g)).toHaveLength(2);
    expect(gym).toContain('text-4xl');
    const compact = renderToStaticMarkup(createElement(Stepper, { ...props, size: 'compact' }));
    expect(compact).not.toContain('glass-strong');
    expect(compact).toContain('text-lg font-bold');
    expect(compact.match(/min-h-12 min-w-12/g)).toHaveLength(2);
    expect(compact).toContain('aria-live="polite"');
  });
  it('renders translated skeleton status with content-shaped presets', () => {
    for (const component of [Skeleton, SkeletonText, SkeletonCard, SkeletonList]) {
      const html = renderToStaticMarkup(createElement(component));
      expect(html).toContain('role="status"');
      expect(html).toContain('جاري التحميل');
      expect(html).toContain('shimmer');
    }
    expect(renderToStaticMarkup(createElement(SkeletonText, { lines: 4 })).match(/shimmer/g)).toHaveLength(4);
    expect(renderToStaticMarkup(createElement(SkeletonList, { rows: 2 })).match(/rounded-full/g)).toHaveLength(2);
  });

  it('caps the toast stack, preserves error roles and dismisses on schedule', () => {
    vi.useFakeTimers();
    try {
      const queue = createToastQueue({ now: () => Date.now(), setTimer: setTimeout, clearTimer: clearTimeout });
      queue.success('one'); queue.success('two'); queue.success('three'); queue.error('four');
      expect(queue.getSnapshot().map(item => item.text)).toEqual(['two', 'three', 'four']);
      const html = renderToStaticMarkup(createElement(ToastProvider, { queue }));
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-label="اقفل الإشعار"');
      vi.advanceTimersByTime(4000);
      expect(queue.getSnapshot().filter(item => !item.leaving).map(item => item.text)).toEqual(['four']);
      vi.advanceTimersByTime(2000);
      expect(queue.getSnapshot().every(item => item.leaving)).toBe(true);
      vi.advanceTimersByTime(200);
      expect(queue.getSnapshot()).toEqual([]);
      queue.dispose();
    } finally { vi.useRealTimers(); }
  });

  it('pauses independently for hover and focus, then resumes the remaining duration', () => {
    vi.useFakeTimers();
    try {
      const queue = createToastQueue({ now: () => Date.now(), setTimer: setTimeout, clearTimer: clearTimeout });
      queue.success('saved');
      const id = queue.getSnapshot()[0]?.id ?? '';
      vi.advanceTimersByTime(1000);
      queue.pause(id, 'hover'); queue.pause(id, 'focus');
      vi.advanceTimersByTime(10000);
      queue.resume(id, 'hover');
      vi.advanceTimersByTime(10000);
      expect(queue.getSnapshot()[0]?.leaving).toBe(false);
      queue.resume(id, 'focus');
      vi.advanceTimersByTime(2999);
      expect(queue.getSnapshot()[0]?.leaving).toBe(false);
      vi.advanceTimersByTime(1);
      expect(queue.getSnapshot()[0]?.leaving).toBe(true);
      queue.dismiss(id);
      vi.advanceTimersByTime(200);
      expect(queue.getSnapshot()).toEqual([]);
      queue.dispose();
    } finally { vi.useRealTimers(); }
  });
  it('cleans up timers when a dismissed toast loses hover and focus', () => {
    vi.useFakeTimers();
    try {
      const queue = createToastQueue({ now: () => Date.now(), setTimer: setTimeout, clearTimer: clearTimeout });
      queue.error('failed');
      const id = queue.getSnapshot()[0]?.id ?? '';
      queue.pause(id, 'hover'); queue.pause(id, 'focus');
      queue.dismiss(id);
      queue.resume(id, 'hover'); queue.resume(id, 'focus');
      queue.dispose();
      expect(queue.getSnapshot()).toEqual([]);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it('adds press feedback and reserves glow for the primary button only', () => {
    for (const component of [createElement(Button), createElement(IconButton, { 'aria-label': 'Open' }),
      createElement(Chip, { pressed: true })]) {
      expect(renderToStaticMarkup(component)).toMatch(/class="[^"]*\bpress\b/);
    }
    expect(renderToStaticMarkup(createElement(Button))).toContain('glow');
    expect(renderToStaticMarkup(createElement(Button, { variant: 'secondary' }))).not.toContain('glow');
    expect(renderToStaticMarkup(createElement(Chip, { pressed: true }))).not.toContain('glow');
    expect(renderToStaticMarkup(createElement(Chip, { pressed: false }))).not.toContain('glow');
    expect(renderToStaticMarkup(createElement(Segmented, { value: 'a', onChange: () => {},
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }))).not.toContain('glow');
    expect(renderToStaticMarkup(createElement(BottomNav, { items: [
      { href: '/', label: 'Home', icon: Home, active: true },
      { href: '/other', label: 'Other', icon: Home },
    ] }))).not.toContain('glow');
    expect(renderToStaticMarkup(createElement(SwitchTrack, { on: true }))).not.toContain('glow');
    for (const variant of ['secondary', 'ghost', 'danger'] as const) {
      expect(renderToStaticMarkup(createElement(Button, { variant }))).not.toContain('glow');
    }
  });

  it.each(['dark', 'light'])('keeps text readable with the actual %s strong-glass token', theme => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    const source = theme === 'light' ? css.split("html[data-theme='light'] {")[1]?.split('}')[0] ?? '' : css;
    const token = (name: string) => {
      const hex = source.match(new RegExp(`--color-${name}: #([0-9a-f]{6})`))?.[1];
      if (!hex) throw new Error(`Missing ${name}`);
      return [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
    };
    const tint = source.match(/--glass-strong-tint: rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/);
    if (!tint) throw new Error('Missing strong glass tint');
    const alpha = Number(tint[4]);
    const glowAlpha = theme === 'light' ? .06 : .14;
    const mesh = token('bg').map((channel, index) => channel * (1 - glowAlpha) + (token('lime')[index] ?? 0) * glowAlpha);
    const background = mesh.map((channel, index) => Number(tint[index + 1]) * alpha + channel * (1 - alpha));
    const luminance = (rgb: number[]) => rgb.reduce((sum, value, index) => {
      const channel = value / 255;
      return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
        * ([.2126, .7152, .0722][index] ?? 0);
    }, 0);
    for (const name of ['ink', 'muted', 'lime-ink', 'warn', 'danger']) {
      const a = luminance(token(name)), b = luminance(background);
      expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('animates mounted views and keeps gym controls free of hover lift', () => {
    for (const component of [createElement(EmptyState, { icon: Home, title: 'Empty', body: 'Body' }),
      createElement(ErrorState, { message: 'Error', retryLabel: 'Retry', onRetry: () => {} }),
      createElement(LoadingState), createElement(RouteLoading), createElement(Template),
      createElement(ResponsiveDialog, { fallbackId: 'fallback', onDismiss: () => {} })]) {
      expect(renderToStaticMarkup(component)).toMatch(/class="[^"]*\benter\b/);
    }
    const html = renderToStaticMarkup(createElement(Stepper, { label: 'Reps', value: 1, step: 1, onChange: () => {} }));
    expect(html.match(/\bpress-scale\b/g)).toHaveLength(2);
    expect(html).not.toMatch(/\bpress\s/);
  });

  it('limits hover lift to fine pointers and disables motion for reduced motion', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain('transform, box-shadow, background-color, border-color, opacity');
    expect(css).toContain('0 0 0 1px color-mix(in srgb, var(--color-lime) 25%, transparent)');
    expect(css).toContain('0 4px 14px color-mix(in srgb, var(--color-lime) 16%, transparent)');
    expect(css).toContain('0 0 0 1px color-mix(in srgb, var(--color-lime) 35%, transparent)');
    expect(css).toContain('0 6px 18px color-mix(in srgb, var(--color-lime) 22%, transparent)');
    expect(css).toContain('box-shadow: var(--press-glow-hover, 0 0 transparent), 0 10px 20px -12px');
    expect(css).toContain('.empty-state-in { animation: surface-in .28s ease-out; }');
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.press', '.press-scale', '.enter', '.shimmer', '.toast-leave']) expect(reduced).toContain(selector);
    expect(reduced).toContain('animation: none');
    expect(reduced).toContain('transition: none');
    expect(reduced).toContain('scale: none');
    expect(reduced).toContain('translate: none');
  });
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

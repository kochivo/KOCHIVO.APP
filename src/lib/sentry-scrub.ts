import type { Breadcrumb, Event } from '@sentry/nextjs';

const sensitiveKey = /email|phone|password|token|weight|kg|waist|photo|video|path|note|reply|full_?name|name|intake|injuries|medical|allergies/i;
const removedKey = /^(user|data|body|cookies|headers|query_string)$/i;
// Stack-frame locations match the broad name/path patterns but hold code locations, not user data.
const frameKey = /^(filename|abs_path|module|function)$/;
const email = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const phone = /(?<!\w)\+?\d[\d ().-]{6,}\d(?!\w)|\(\d{2,4}\)[\d .-]{6,}\d/g;

function scrubText(value: string): string {
  return value.replace(/https?:\/\/[^\s"'<>]+|\/[^\s"'<>]*\?[^\s"'<>]*/gi,
    (url) => url.includes('/storage/') ? '[Redacted]' : url.split(/[?#]/)[0] ?? '')
    .replace(email, '[Redacted]').replace(phone, '[Redacted]');
}

function scrub(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Redacted]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrub(item, seen));
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (removedKey.test(key)) return [];
    return [[key, sensitiveKey.test(key) && !frameKey.test(key) ? '[Redacted]' : scrub(item, seen)]];
  }));
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const url = breadcrumb.data?.url;
  if (/fetch|xhr|http/i.test(breadcrumb.category ?? '') && typeof url === 'string'
    && /\/storage\/|\?/i.test(url)) return null;
  // DOM text and console arguments can contain unstructured personal details.
  if (/^(ui\.|console)/.test(breadcrumb.category ?? '')) return null;
  const { data, ...rest } = breadcrumb;
  return { ...scrub(rest) as Breadcrumb, ...(data ? { data: scrub(data) as Breadcrumb['data'] } : {}) };
}

export function beforeSend<T extends Event>(event: T): T {
  const { request, breadcrumbs, ...rest } = event;
  const clean = scrub(rest) as T;
  if (request) {
    // Keep only diagnostic request metadata; credentials and payloads never leave the device.
    clean.request = {
      ...(request.method ? { method: scrubText(request.method) } : {}),
      ...(request.url ? { url: scrubText(request.url.split(/[?#]/)[0] ?? '') } : {}),
    };
  }
  if (breadcrumbs) clean.breadcrumbs = breadcrumbs.flatMap((item) => {
    const cleanBreadcrumb = beforeBreadcrumb(item);
    return cleanBreadcrumb ? [cleanBreadcrumb] : [];
  });
  return clean;
}

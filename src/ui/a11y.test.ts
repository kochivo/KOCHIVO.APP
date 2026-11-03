import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button, Stepper, TextField } from './index';

describe('accessible shared controls', () => {
  it('labels the stepper output and isolates its number', () => {
    const html = renderToStaticMarkup(createElement(Stepper, { label: 'الوزن', value: 25, step: 1, onChange: () => {} }));
    expect(html).toContain('aria-label="الوزن"');
    expect(html).toContain('<bdi>25</bdi>');
    expect(html).toContain('aria-label="زوّد الوزن"');
    expect(html).toContain('aria-label="قلّل الوزن"');
    expect(html).toContain('size-19');
  });
  it('disables transitions for reduced motion', () => {
    expect(renderToStaticMarkup(createElement(Button, {}, 'احفظ'))).toContain('motion-reduce:transition-none');
  });
  it('announces field errors', () => {
    expect(renderToStaticMarkup(createElement(TextField, { label: 'الاسم', error: 'اكتب اسمك' }))).toContain('role="alert"');
  });
});

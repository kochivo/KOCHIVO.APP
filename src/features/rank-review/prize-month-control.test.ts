import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PrizeMonthControl } from './components/prize-month-control';

const now = new Date('2026-11-14T12:00:00Z');

describe('prize month control', () => {
  it('uses the legacy next-month selection flow', () => {
    const onChange = vi.fn();
    const control = PrizeMonthControl({ locale: 'en', now, month: '2026-11-01', onChange });
    expect(control).not.toBeNull();
    control?.props.onClick();
    expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-12-01');
    const html = renderToStaticMarkup(createElement(PrizeMonthControl, {
      locale: 'en', now, month: '2026-11-01', onChange,
    }));
    expect(html).toContain('Set next month');
    expect(html).toContain('control-secondary');
    expect(html).not.toContain('bg-lime');
  });
  it('can return from next-month prize setup to the current board', () => {
    const onChange = vi.fn();
    const control = PrizeMonthControl({ locale: 'en', now, month: '2026-12-01', onChange });
    control?.props.onClick();
    expect(onChange).toHaveBeenCalledExactlyOnceWith('2026-11-01');
  });
});

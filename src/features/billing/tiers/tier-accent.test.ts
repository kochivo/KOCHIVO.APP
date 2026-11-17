import { describe, expect, it } from 'vitest';
import { tierAccent } from './tier-accent';

describe('tierAccent', () => {
  it('maps each saved package colour to its own bar and text class', () => {
    expect(tierAccent('lime')).toEqual({ bar: 'bg-lime', text: 'text-lime' });
    expect(tierAccent('warn')).toEqual({ bar: 'bg-warn', text: 'text-warn' });
    expect(tierAccent('danger')).toEqual({ bar: 'bg-danger', text: 'text-danger' });
    expect(tierAccent('muted')).toEqual({ bar: 'bg-muted', text: 'text-ink' });
  });

  it('falls back to grey for unknown or missing colours', () => {
    expect(tierAccent('purple')).toEqual(tierAccent('muted'));
    expect(tierAccent(null)).toEqual(tierAccent('muted'));
    expect(tierAccent(undefined)).toEqual(tierAccent('muted'));
  });
});

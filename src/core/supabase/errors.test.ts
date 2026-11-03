import { describe, expect, it } from 'vitest';
import { isMissingRow, isPermissionDenied, readError } from './errors';

describe('error reading', () => {
  it.each([null, undefined, 42, '42501', true, Symbol('error')])('ignores non-object error %s', error => {
    expect(readError(error)).toEqual({ code: undefined, message: undefined });
    expect(isPermissionDenied(error)).toBe(false);
    expect(isMissingRow(error, true)).toBe(false);
  });
  it('reads Error instances and plain objects without coercing domain codes', () => {
    expect(readError(Object.assign(new Error('denied'), { code: '42501' })))
      .toEqual({ code: '42501', message: 'denied' });
    expect(readError({ code: 42501, message: null })).toEqual({ code: 42501, message: null });
    expect(isPermissionDenied({ code: 42501 })).toBe(false);
  });
  it('safely ignores throwing accessors', () => {
    expect(readError({ get code() { throw new Error('unreadable'); }, message: 'readable' }))
      .toEqual({ code: undefined, message: 'readable' });
  });
  it('classifies only the shared codes and opts into P0002', () => {
    expect(isPermissionDenied({ code: '42501' })).toBe(true);
    expect(isPermissionDenied({ code: '22023' })).toBe(false);
    expect(isMissingRow({ code: 'PGRST116' })).toBe(true);
    expect(isMissingRow({ code: 'P0002' })).toBe(false);
    expect(isMissingRow({ code: 'P0002' }, true)).toBe(true);
    expect(isMissingRow({ code: '22023' }, true)).toBe(false);
  });
});

import { expect, it } from 'vitest';
import { parseTypedNumber } from './typed-number';

it.each([
  ['62.5', 62.5], [' 80 ', 80], ['٦٢٫٥', 62.5], ['۱۲', 12], ['62,5', 62.5], ['.5', 0.5], ['12.', 12],
])('reads %s as %s', (text, value) => expect(parseTypedNumber(text)).toBe(value));

it.each(['', 'abc', '-5', '1.2.3', '5kg'])('rejects %s', text => expect(parseTypedNumber(text)).toBeNull());

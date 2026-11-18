import { expect, it } from 'vitest';
import { otpDigits } from './otp-digits';

it.each(['0123456789', '٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹'])('normalizes OTP digits from %s', input => {
  expect(otpDigits(input)).toBe('0123456789');
});

it('accepts mixed pasted digits and strips separators', () => {
  expect(otpDigits('٠1-۲ ٣4٥')).toBe('012345');
});

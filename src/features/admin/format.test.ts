import { expect, it } from 'vitest';
import { actionError } from './format';

it.each([
  [{ code: '42501' }, 'مش مسموح'],
  [{ code: '22023', message: 'unknown tier' }, 'الباقة مش موجودة'],
  [{ code: '22023', message: 'other' }, 'البيانات مش صحيحة، راجع الحساب والمدة'],
  [{ code: 'P0002' }, 'العملية ما كملتش، جرّب تاني'],
  [new Error('private'), 'العملية ما كملتش، جرّب تاني'],
  [null, 'العملية ما كملتش، جرّب تاني'],
])('keeps the admin mapping for %s', (error, message) => {
  expect(actionError(error)).toBe(message);
});

import { expect, it } from 'vitest';
import { packageSelection, selectionQuery } from './package-selection';
it('keeps only UUID references and never transports a client price', () => {
  expect(packageSelection({ package: 'tampered', offer: 'bad', price: 1 })).toEqual({});
  const id = '01900000-0000-7000-8000-000000000208';
  expect(selectionQuery({ package: id, offer: id })).toBe(`&package=${id}&offer=${id}`);
});

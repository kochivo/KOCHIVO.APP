import { expect, it } from 'vitest';
import { validReceiptImage } from './image';
it('accepts only nonempty JPEG, PNG and WebP images up to 5 MB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    expect(validReceiptImage({ type, size: 5242880 })).toBe(true);
  }
  for (const file of [{ type: 'image/svg+xml', size: 100 }, { type: 'application/pdf', size: 100 },
    { type: 'image/jpeg', size: 5242881 }, { type: 'image/jpeg', size: 0 }]) expect(validReceiptImage(file)).toBe(false);
});

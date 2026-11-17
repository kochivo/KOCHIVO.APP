import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

// A `capture` attribute makes phones open the camera only, so players could not pick saved photos.
it.each([
  'src/features/progress/components/checkin-sheet.tsx',
  'src/features/billing/receipts/upload-sheet.tsx',
])('%s lets players pick a photo from the gallery', file => {
  expect(readFileSync(join(process.cwd(), file), 'utf8')).not.toMatch(/\bcapture=/);
});

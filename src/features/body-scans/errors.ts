import type { ScanTranslator } from './types';

export function scanError(error: unknown, t: ScanTranslator, fallback: 'saveError' | 'deleteError'): string {
  const expected = ['offline', 'invalid', 'fileError', 'imageIsTooLargeOrUnsupportedChoose'] as const;
  return error instanceof Error && expected.some(key => t(key) === error.message) ? error.message : t(fallback);
}

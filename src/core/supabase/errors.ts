function property(error: unknown, key: 'code' | 'message'): unknown {
  try {
    if (error !== null && typeof error === 'object') {
      if (key === 'code' && 'code' in error) return error.code;
      if (key === 'message' && 'message' in error) return error.message;
    }
  } catch { /* Unknown errors can have throwing getters or proxy traps. */ }
  return undefined;
}

export function readError(error: unknown): { code: unknown; message: unknown } {
  // Preserve values so callers retain their existing strict comparisons or coercion.
  return { code: property(error, 'code'), message: property(error, 'message') };
}

export function isPermissionDenied(error: unknown): boolean {
  return readError(error).code === '42501';
}

export function isMissingRow(error: unknown, includeP0002 = false): boolean {
  const { code } = readError(error);
  return code === 'PGRST116' || (includeP0002 && code === 'P0002');
}

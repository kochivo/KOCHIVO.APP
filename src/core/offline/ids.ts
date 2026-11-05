/**
 * Deterministic UUID (v8 layout) from SHA-256 of the parts. The same logical record gets the
 * same id on every device — e.g. set (session, exercise, index) — so two phones logging the
 * same set update one row and the server keeps the latest client_updated_at (PRD §7).
 */
export async function stableId(...parts: string[]): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('\u001f')));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80; // version 8 (custom)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * UUID v7: 48-bit ms timestamp + random. Generated on the device so a retried write
 * hits the same row (idempotent) and ids sort by creation time.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let ts = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts & 0xff;
    ts = Math.floor(ts / 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  return formatUuid(bytes);
}

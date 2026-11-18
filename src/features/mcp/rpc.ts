import { z } from 'zod';

const maxBytes = 64 * 1024;
const envelope = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  params: z.unknown().optional(),
});
export const callParams = z.object({ name: z.string().min(1), arguments: z.record(z.string(), z.unknown()).optional() });
export const initializeParams = z.object({ protocolVersion: z.string() });

export async function readRpc(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    return { status: 415, code: -32600, message: 'Expected application/json' } as const;
  }
  const reader = request.body?.getReader();
  if (!reader) return { status: 400, code: -32700, message: 'Parse error' } as const;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return { status: 413, code: -32600, message: 'Request body exceeds 64 KB' } as const;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    const value: unknown = JSON.parse(text + decoder.decode());
    const parsed = envelope.safeParse(value);
    if (parsed.success) return { status: 200, data: parsed.data } as const;
    return { status: 400, code: -32600, message: 'Invalid request' } as const;
  } catch {
    void reader.cancel().catch(() => {});
    return { status: 400, code: -32700, message: 'Parse error' } as const;
  } finally {
    reader.releaseLock();
  }
}

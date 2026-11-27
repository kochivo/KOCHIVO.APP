export const maxWorkbookBytes = 5 * 1024 * 1024;
const maxXmlBytes = 4 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });

export function xlsxZip(buffer: ArrayBuffer) {
  if (buffer.byteLength > maxWorkbookBytes) throw new Error('fileSize');
  const view = new DataView(buffer);
  const short = (at: number) => view.getUint16(at, true);
  const long = (at: number) => view.getUint32(at, true);
  const fail = () => { throw new Error('invalidFile'); };
  let directory = buffer.byteLength - 22;
  const minOffset = Math.max(0, directory - 65535);
  while (directory >= minOffset && (long(directory) !== 0x06054b50 || directory + 22 + short(directory + 20) !== buffer.byteLength)) {
    directory--;
  }
  if (directory < minOffset || short(directory + 4) || short(directory + 6)) return fail();
  const total = short(directory + 10);
  let cursor = long(directory + 16);
  if (total > 1024 || total !== short(directory + 8) || cursor + long(directory + 12) !== directory) return fail();
  const entries = new Map<string, { offset: number; length: number; size: number; method: number }>();
  for (let i = 0; i < total; i++) {
    if (cursor + 46 > directory || long(cursor) !== 0x02014b50) return fail();
    const nameLength = short(cursor + 28);
    const next = cursor + 46 + nameLength + short(cursor + 30) + short(cursor + 32);
    if (next > directory) return fail();
    const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    if (entries.has(name) || short(cursor + 8) & 1) return fail();
    entries.set(name, { offset: long(cursor + 42), length: long(cursor + 20), size: long(cursor + 24), method: short(cursor + 10) });
    cursor = next;
  }
  if (cursor !== directory) return fail();

  return async (name: string) => {
    const entry = entries.get(name);
    if (!entry) return null;
    const { offset, length, size, method } = entry;
    if (offset + 30 > directory || long(offset) !== 0x04034b50 || size > maxXmlBytes) return fail();
    const dataOffset = offset + 30 + short(offset + 26) + short(offset + 28);
    if (dataOffset + length > directory) return fail();
    const bytes = new Uint8Array(buffer, dataOffset, length);
    if (method === 0 && length === size) return decoder.decode(bytes);
    if (method !== 8) return fail();
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const output = new Uint8Array(size);
    let written = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        if (written + result.value.byteLength > size) return fail();
        output.set(result.value, written);
        written += result.value.byteLength;
      }
    } finally {
      await reader.cancel();
    }
    if (written !== size) return fail();
    return decoder.decode(output);
  };
}

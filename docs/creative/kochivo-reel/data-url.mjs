export function decodeDataUrl(value) {
  const marker = ';base64,';
  const start = value.indexOf(marker);
  if (!value.startsWith('data:') || start < 0) throw new Error('Expected a base64 data URL');
  // MediaRecorder can include a comma-separated codec list in the MIME type.
  return Buffer.from(value.slice(start + marker.length), 'base64');
}

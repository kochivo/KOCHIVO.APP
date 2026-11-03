export function shareText(value: string) {
  // This Next version shapes Arabic glyphs but lays out words in LTR order.
  const firstLetter = value.match(/[\p{L}]/u)?.[0] ?? '';
  return /[\u0600-\u06ff]/.test(firstLetter) ? value.split(/\s+/).reverse().join(' ') : value;
}

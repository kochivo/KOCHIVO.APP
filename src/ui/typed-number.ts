/** Reads a number typed on any keyboard: Arabic-Indic and Persian digits, and the Arabic decimal or comma separators. */
export function parseTypedNumber(text: string): number | null {
  const normalized = text.trim()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[٫,]/g, '.');
  if (!/^\d+(?:\.\d*)?$|^\.\d+$/.test(normalized)) return null;
  return Number(normalized);
}

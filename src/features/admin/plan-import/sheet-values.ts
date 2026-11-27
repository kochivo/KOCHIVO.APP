export type Sheet = { name: string; rows: string[][]; displayRows?: string[][] };

export function sheetNumber(value: string | undefined, min: number, max: number, whole = false) {
  const input = (value ?? '').trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15))
    .replace(/[٫,]/g, '.');
  const number = Number(input);
  if (!/^\d+(?:\.\d+)?$/.test(input) || number < min || number > max || (whole && !Number.isInteger(number))) {
    throw new Error('invalidNumber');
  }
  return number;
}

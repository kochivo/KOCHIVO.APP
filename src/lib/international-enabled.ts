export function internationalEnabled(flag = process.env.NEXT_PUBLIC_INTERNATIONAL): boolean {
  return flag === '1';
}

export function otpDigits(input: string) {
  return input.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code - (code < 0x06f0 ? 0x0660 : 0x06f0));
  }).replace(/[^0-9]/g, '');
}

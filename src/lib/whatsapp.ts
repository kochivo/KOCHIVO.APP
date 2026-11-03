export function whatsappUrl(options: { phone?: undefined; text?: string }): string;
export function whatsappUrl(options: { phone?: string; text?: string }): string | null;
export function whatsappUrl({ phone, text }: { phone?: string; text?: string }): string | null {
  const digits = phone?.replace(/\D/g, '');
  if (phone !== undefined && !digits) return null;
  if (digits) return `https://wa.me/${digits}${text === undefined ? '' : `?text=${encodeURIComponent(text)}`}`;
  return `https://wa.me/?text=${encodeURIComponent(text ?? '')}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

export function renewalPreview(accessUntil: string, today: string, days: number) {
  const next = addDays(accessUntil, 1);
  const start = next > today ? next : today;
  return { start, end: addDays(start, days - 1) };
}

export function reminderText(playerName: string, accessUntil: string): string {
  const date = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${accessUntil}T00:00:00Z`));
  return `يا ${playerName}، اشتراكك مع الكابتن بيخلص ${date}. تحب نجدد؟`;
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  const digits = phone?.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

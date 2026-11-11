type Named = { name_ar: string | null; name_en: string | null };

export function normalizeName(name: string) {
  return name.normalize('NFKD').replace(/\p{M}|ـ/gu, '').toLowerCase()
    .replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/(^| )ال(?=\p{Script=Arabic}{3})/gu, '$1');
}

export function matchNamed<T extends Named>(rows: readonly T[], name: string): T[] {
  const key = normalizeName(name);
  if (!key) return [];
  const names = (row: T) => [row.name_ar, row.name_en].map(value => normalizeName(value ?? ''));
  const exact = rows.filter(row => names(row).includes(key));
  if (exact.length || key.length < 3) return exact;
  return rows.filter(row => names(row).some(value => ` ${value} `.includes(` ${key} `)));
}

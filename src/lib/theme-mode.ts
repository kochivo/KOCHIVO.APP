type ThemeInput = { stored?: string | null; prefersDark: boolean; pathname?: string; workspace?: boolean };

export function themeMode({ stored, prefersDark, pathname = '', workspace = false }: ThemeInput): 'light' | 'dark' {
  if (workspace && /^(?:\/(?:ar|en))?\/captain(?:\/|$)/u.test(pathname)) return 'dark';
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

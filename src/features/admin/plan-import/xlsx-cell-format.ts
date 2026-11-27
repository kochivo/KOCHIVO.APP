const builtInDate = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

export function cellDisplay(raw: string, cellType: string | null, numberFormat: number, format: string, date1904: boolean) {
  if (!raw || (cellType !== null && cellType !== 'n' && cellType !== 'b')) return raw;
  if (cellType === 'b') return raw === '1' ? 'TRUE' : 'FALSE';
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  const pattern = format.split(';')[0]?.replace(/"[^"]*"|\\.|\[[^\]]*\]/g, '').toLowerCase() ?? '';
  const percent = numberFormat === 9 || numberFormat === 10 || pattern.includes('%');
  if (percent) {
    const decimals = numberFormat === 10 ? 2 : pattern.match(/\.(0+)%/)?.[1]?.length ?? 0;
    return `${(value * 100).toFixed(Math.min(10, decimals))}%`;
  }
  if (value >= 0 && value < 2958466 && (builtInDate.has(numberFormat) || /[yd]|h+:m|m+:s/.test(pattern))) {
    const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, value < 60 ? 31 : 30);
    const date = new Date(epoch + Math.round(value * 86400000));
    const iso = date.toISOString();
    const time = numberFormat >= 18 && numberFormat <= 21 || numberFormat >= 45 && numberFormat <= 47
      || (!/[yd]/.test(pattern) && /h|s/.test(pattern));
    return time ? iso.slice(11, 19) : pattern.includes('h') || numberFormat === 22
      ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
  }
  const decimals = /^#?[,#0]+\.(0+)$/.exec(pattern)?.[1]?.length;
  return decimals !== undefined ? value.toFixed(Math.min(10, decimals)) : raw;
}

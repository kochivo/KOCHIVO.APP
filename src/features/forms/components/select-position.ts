export function selectPosition(rect: { x: number; top: number; bottom: number; width: number }, width: number, height: number, rtl: boolean) {
  const panelWidth = Math.min(Math.max(rect.width, 192), width - 16);
  const start = Math.max(8, Math.min(rtl ? width - rect.x - rect.width : rect.x, width - panelWidth - 8));
  const below = height - rect.bottom - 12, above = rect.top - 12;
  const panelHeight = Math.max(0, Math.min(288, Math.max(below, above)));
  const top = below >= Math.min(288, above) ? rect.bottom + 4 : Math.max(8, rect.top - panelHeight - 4);
  return { start, top, width: panelWidth, height: panelHeight };
}

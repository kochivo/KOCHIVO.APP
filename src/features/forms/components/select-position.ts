export function selectPosition(rect: { x: number; top: number; bottom: number; width: number }, width: number, height: number, rtl: boolean) {
  const panelWidth = Math.min(Math.max(rect.width, 192), width - 16);
  const start = Math.max(8, Math.min(rtl ? width - rect.x - rect.width : rect.x, width - panelWidth - 8));
  const below = height - rect.bottom - 12, above = rect.top - 12;
  const downward = below >= Math.min(288, above);
  const maxBlockSize = Math.max(0, Math.min(288, downward ? below : above));
  return { start, top: downward ? rect.bottom + 4 : undefined,
    bottom: downward ? undefined : height - rect.top + 4, width: panelWidth, maxBlockSize };
}

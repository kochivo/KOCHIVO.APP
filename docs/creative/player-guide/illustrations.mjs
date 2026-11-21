import { box, write } from './draw.mjs';

export function drawIllustration(ctx, panel, colors, diagnostics) {
  const x = 140, y = 400, w = 800, h = 1100;
  box(ctx, x, y, w, h, colors.surface, colors.line, 36);
  ctx.fillStyle = colors.lime;
  ctx.fillRect(x + w - 65, y + 42, 8, 55);
  const heading = write(ctx, panel.heading, x + w - 94, y + 85, {
    color: colors.ink, size: panel.mode === 'hero' ? 62 : 52, font: 'Changa', weight: 700, width: w - 150,
  });
  if (heading.bottom > y + 190 || heading.overflow) diagnostics.push('panel heading');
  const start = y + (heading.lines > 1 ? 235 : 195);
  const spacing = panel.rows.length > 3 ? 162 : 180;
  panel.rows.forEach((row, index) => {
    const top = start + index * spacing;
    box(ctx, x + 30, top - 24, w - 60, spacing - 18, colors.bg, colors.line, 18);
    write(ctx, row.label, x + w - 60, top + 12, { color: colors.muted, size: 27, width: w - 120 });
    const value = write(ctx, row.value, x + w - 60, top + 67, {
      color: panel.mode === 'hero' ? colors.ink : colors.lime, size: 34, width: w - 120, lineHeight: 50,
      direction: /^[\d\s@.a-z]+$/i.test(row.value) ? 'ltr' : 'rtl',
    });
    if (value.overflow || value.bottom > top + spacing - 40) diagnostics.push(`panel row ${index}`);
  });
  if (panel.action) {
    box(ctx, x + 40, y + h - 202, w - 80, 92, colors.lime, undefined, 18);
    const action = write(ctx, panel.action, x + w / 2, y + h - 140, {
      color: colors.bg, size: 40, weight: 700, font: 'Changa', width: w - 110, align: 'center',
    });
    if (action.lines > 1 || action.overflow) diagnostics.push('panel action');
  }
  if (panel.footer) {
    const footer = write(ctx, panel.footer, x + w / 2, y + h - 61, {
      color: colors.muted, size: 24, width: w - 90, align: 'center', lineHeight: 36,
    });
    if (footer.bottom > y + h - 12 || footer.overflow) diagnostics.push('panel footer');
  }
}

export function box(ctx, x, y, w, h, fill, stroke, radius = 28) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

export function write(ctx, value, x, y, options) {
  const { color, size = 40, width = 900, weight = 500, align = 'right', font = 'Alexandria', lineHeight = size * 1.6,
    direction = align === 'left' ? 'ltr' : 'rtl' } = options;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.direction = direction;
  ctx.fillStyle = color;
  const words = String(value).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((content, index) => ctx.fillText(content, x, y + index * lineHeight));
  const overflow = lines.some(content => ctx.measureText(content).width > width + 1);
  ctx.restore();
  return { lines: lines.length, bottom: y + (lines.length - 1) * lineHeight, overflow };
}

export function fit(ctx, image, x, y, w, h) {
  const scale = Math.min(w / image.width, h / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, x + (w - width) / 2, y + (h - height) / 2, width, height);
}

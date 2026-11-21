import { clamp, ease } from './timeline.mjs';

export function rounded(ctx, x, y, w, h, radius = 28) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

export function text(ctx, value, x, y, options = {}) {
  const { size = 48, weight = 600, color, align = 'right', font = 'Changa', maxWidth = 910 } = options;
  ctx.save();
  ctx.direction = align === 'right' ? 'rtl' : 'ltr';
  ctx.textAlign = align;
  let actualSize = size;
  ctx.font = `${weight} ${actualSize}px ${font}`;
  while (ctx.measureText(value).width > maxWidth && actualSize > 24) {
    actualSize -= 1;
    ctx.font = `${weight} ${actualSize}px ${font}`;
  }
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  ctx.restore();
  return actualSize;
}

export function imageFit(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

export function enter(ctx, elapsed, callback, delay = 0, distance = 50) {
  const p = ease((elapsed - delay) / 0.65);
  ctx.save();
  ctx.globalAlpha *= p;
  ctx.translate(0, distance * (1 - p));
  callback();
  ctx.restore();
}

export function clippedReveal(ctx, elapsed, callback, box) {
  const p = ease(elapsed / 0.7);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y + box.h * (1 - p), box.w, box.h * p);
  ctx.clip();
  callback();
  ctx.restore();
}

export function editorialFrame(ctx, image, box, progress, colors, label, demo, options = {}) {
  const { x, y, w, h } = box;
  ctx.save();
  ctx.fillStyle = colors.surface;
  rounded(ctx, x, y, w, h, 30);
  ctx.fill();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = colors.lime;
  rounded(ctx, x + w - 46, y + 28, 10, 10, 2);
  ctx.fill();
  text(ctx, label, x + w - 65, y + 40, { size: 24, font: 'Alexandria', color: colors.ink });
  text(ctx, demo, x + 24, y + 40, { size: 20, font: 'Alexandria', color: colors.muted, align: 'left' });
  const inset = 14;
  const contentY = y + 66;
  const contentHeight = h - 80;
  rounded(ctx, x + inset, contentY, w - inset * 2, contentHeight, 18);
  ctx.clip();
  const scale = (w - inset * 2) / image.width;
  const imageHeight = image.height * scale;
  const travel = Math.max(0, imageHeight - contentHeight);
  const scroll = clamp((progress - 0.13) / 0.72);
  const zoom = options.zoom || 1;
  ctx.translate(x + w / 2, contentY + contentHeight / 2);
  ctx.scale(zoom, zoom);
  ctx.drawImage(image, -(w - inset * 2) / 2, -contentHeight / 2 - travel * scroll, w - inset * 2, imageHeight);
  ctx.restore();
}

export function caption(ctx, value, elapsed, colors) {
  enter(ctx, elapsed, () => {
    ctx.fillStyle = colors.lime;
    ctx.fillRect(491, 1606, 98, 4);
    text(ctx, value, 540, 1680, { size: 42, weight: 500, align: 'center', font: 'Alexandria', maxWidth: 900, color: colors.ink });
  }, 0.5, 20);
}

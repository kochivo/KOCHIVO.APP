import { locate, captionAt, ease, formatTime } from './timeline.mjs';
import { box, write, fit } from './draw.mjs';
import { drawIllustration } from './illustrations.mjs';

export function createRenderer(canvas, images, colors, messages, timeline) {
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingQuality = 'high';
  function screenshot(scene, progress) {
    const image = images[scene.asset];
    const x = 140, y = 400, w = 800, h = 1100;
    box(ctx, x - 3, y - 3, w + 6, h + 6, colors.surface, colors.line, 36);
    ctx.save();
    box(ctx, x, y, w, h, undefined, undefined, 32);
    ctx.clip();
    const scale = w / image.width;
    const skip = image.width * (['workout', 'rest'].includes(scene.asset) ? .32 : .5);
    const visible = h / scale;
    const max = Math.max(skip, image.height - visible);
    const start = Math.min(max, skip + (max - skip) * (scene.focus ?? 0));
    const travel = Math.min(image.width * .13, Math.max(0, max - start));
    const sourceY = start + travel * ease((progress - .25) / .55);
    ctx.drawImage(image, 0, sourceY, image.width, visible, x, y, w, h);
    ctx.restore();
  }
  return function render(time) {
    const state = locate(timeline, time);
    const { scene, index, elapsed, progress } = state;
    const diagnostics = [];
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fit(ctx, images.logo, 70, 65, 260, 80);
    write(ctx, messages.player, 1000, 113, { color: colors.muted, size: 28 });
    write(ctx, `${messages.chapter} ${scene.chapter + 1} / ${messages.chapters[scene.chapter]}`, 1000, 195, {
      color: colors.lime, size: 27, width: 900,
    });
    const heading = write(ctx, scene.title, 1000, 290, { color: colors.ink, size: 67, font: 'Changa', weight: 700, width: 920, lineHeight: 83 });
    if (heading.bottom > 375 || heading.overflow) diagnostics.push('scene heading');
    const opacity = ease(elapsed / .35);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(0, 12 * (1 - opacity));
    if (scene.asset) screenshot(scene, progress);
    else drawIllustration(ctx, scene.panel, colors, diagnostics);
    ctx.restore();
    box(ctx, 380, 1515, 320, 50, colors.surface, colors.line, 25);
    write(ctx, scene.asset ? messages.demo : messages.illustration, 540, 1549, {
      color: colors.muted, size: 23, align: 'center', width: 280,
    });
    const caption = write(ctx, captionAt(state), 540, 1640, {
      color: colors.ink, size: 44, weight: 600, width: 910, align: 'center', lineHeight: 72,
    });
    if (caption.bottom > 1785 || caption.overflow) diagnostics.push('caption');
    const count = scene.captions.length;
    const active = Math.min(count - 1, Math.floor(progress * count));
    for (let i = 0; i < count; i++) box(ctx, 540 - count * 25 + i * 50, 1777, 34, 5,
      i === active ? colors.lime : colors.line, undefined, 2);
    ctx.fillStyle = colors.line;
    ctx.fillRect(80, 1835, 920, 4);
    ctx.fillStyle = colors.lime;
    ctx.fillRect(1000 - 920 * state.time / timeline.duration, 1835, 920 * state.time / timeline.duration, 4);
    write(ctx, `${messages.step} \u2066${index + 1} / ${timeline.entries.length}\u2069`, 1000, 1890, { color: colors.muted, size: 23 });
    write(ctx, `${formatTime(state.time)} / ${formatTime(timeline.duration)}`, 80, 1890, { color: colors.muted, size: 23, align: 'left', font: 'Manrope' });
    return { index, time: state.time, diagnostics };
  };
}

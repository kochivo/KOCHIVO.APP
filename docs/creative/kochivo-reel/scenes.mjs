import { WIDTH, HEIGHT, DURATION, CUTS, position, ease, clamp } from './timeline.mjs';
import { text, imageFit, enter, rounded, editorialFrame, caption } from './draw.mjs';

export function createRenderer(canvas, assets, colors, messages) {
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingQuality = 'high';

  function chrome(time, index) {
    imageFit(ctx, assets.compact, 80, 125, 255, 70);
    text(ctx, messages.film, 1000, 170, { size: 28, font: 'Alexandria', color: colors.muted });
    ctx.fillStyle = colors.line;
    ctx.fillRect(80, 1798, 920, 3);
    ctx.fillStyle = colors.lime;
    ctx.fillRect(1000 - 920 * time / DURATION, 1798, 920 * time / DURATION, 3);
    for (let i = 1; i < CUTS.length - 1; i++) {
      ctx.fillStyle = colors.bg;
      ctx.fillRect(1000 - 920 * CUTS[i] / DURATION - 3, 1795, 6, 9);
    }
    text(ctx, messages.steps[index].name, 1000, 1750, { size: 25, font: 'Alexandria', color: colors.muted });
    text(ctx, `${String(index + 1).padStart(2, '0')} / 08`, 80, 1750, { size: 24, align: 'left', font: 'Manrope', color: colors.muted });
  }

  function title(lines, elapsed) {
    lines.forEach((line, i) => {
      enter(ctx, elapsed, () => {
        text(ctx, line, 990, 365 + i * 126, { size: 100, weight: 700, color: i ? colors.lime : colors.ink });
      }, i * 0.10);
    });
  }

  function opening(elapsed) {
    enter(ctx, elapsed, () => {
      text(ctx, messages.intro[0], 990, 340, { size: 52, font: 'Alexandria', weight: 500, color: colors.muted });
    });
    messages.intro.slice(1).forEach((line, i) => {
      enter(ctx, elapsed, () => {
        text(ctx, line, 990, 528 + i * 162, { size: 139, weight: 700, color: i ? colors.lime : colors.ink });
      }, 0.12 + i * 0.13, 75);
    });
    enter(ctx, elapsed, () => {
      ctx.save();
      ctx.translate(345, 1130);
      ctx.rotate(-0.07 + ease(elapsed / 2) * 0.025);
      editorialFrame(ctx, assets.dashboard, { x: -300, y: -185, w: 600, h: 445 }, 0, colors, messages.captain, messages.demo);
      ctx.restore();
      ctx.save();
      ctx.translate(735, 1290);
      ctx.rotate(0.065 - ease(elapsed / 2) * 0.025);
      editorialFrame(ctx, assets.muscles, { x: -220, y: -370, w: 440, h: 710 }, 0.26, colors, messages.player, messages.demo);
      ctx.restore();
    }, 0.3, 100);
    enter(ctx, elapsed, () => text(ctx, messages.introNote, 540, 1655, { size: 36, weight: 500, font: 'Alexandria', align: 'center', color: colors.ink }), 0.6, 20);
  }

  function feature(state) {
    const item = messages.steps[state.index];
    title(item.title, state.elapsed);
    let box = { x: 85, y: 590, w: 910, h: 945 };
    if (state.index === 1) box = { x: 75, y: 755, w: 930, h: 660 };
    if (state.index === 5) box = { x: 150, y: 560, w: 780, h: 1040 };
    if (state.index === 6) box = { x: 95, y: 620, w: 890, h: 930 };
    enter(ctx, state.elapsed, () => {
      const centerX = box.x + box.w / 2;
      const centerY = box.y + box.h / 2;
      const scale = 0.96 + 0.04 * ease(state.elapsed / 0.8);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      editorialFrame(ctx, assets[item.asset], box, state.progress, colors, messages[item.role], messages.demo);
      ctx.restore();
    }, 0.16, 55);
    caption(ctx, item.sub, state.elapsed, colors);
  }

  function ending(elapsed) {
    messages.outro.forEach((line, i) => {
      enter(ctx, elapsed, () => text(ctx, line, 540, 500 + 160 * i, { size: 138, align: 'center', color: i ? colors.lime : colors.ink, weight: 700 }), 0.1 * i, 65);
    });
    enter(ctx, elapsed, () => imageFit(ctx, assets.primary, 125, 830, 830, 300), 0.24, 35);
    enter(ctx, elapsed, () => {
      ctx.fillStyle = colors.lime;
      rounded(ctx, 280, 1325, 520, 132, 20);
      ctx.fill();
      text(ctx, messages.cta, 540, 1414, { size: 62, align: 'center', weight: 700, color: colors.bg });
    }, 0.55, 30);
  }

  return function render(time) {
    const state = position(time);
    ctx.save();
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    chrome(clamp(time, 0, DURATION), state.index);
    if (state.index === 0) opening(state.elapsed);
    else if (state.index === 7) ending(state.elapsed);
    else feature(state);
    // A short diagonal cut echoes the original mark without redrawing it.
    const untilCut = state.duration - state.elapsed;
    if (untilCut < 0.17 && state.index < 7) {
      const p = 1 - untilCut / 0.17;
      ctx.fillStyle = colors.lime;
      ctx.beginPath();
      const x = -2000 + p * 2800;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 250, 0);
      ctx.lineTo(x + 1300, HEIGHT);
      ctx.lineTo(x + 1050, HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return state;
  };
}

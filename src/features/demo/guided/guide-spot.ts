type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b?: Box | null) => !!b && b.width > 0 &&
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// The guide must never hide the phone or the highlighted control, so it tries
// the four sides of the target and keeps the first spot that covers neither.
export function guideSpot(target: Box | undefined, phone: Box | undefined, width: number, height: number,
  view = { width: innerWidth, height: innerHeight }): [number, number] {
  const clamp = (x: number, y: number): [number, number] => [
    Math.max(16, Math.min(view.width - width - 16, x)), Math.max(90, Math.min(view.height - height - 16, y))];
  if (!target) return clamp((view.width - width) / 2, (view.height - height) / 2);
  const midX = target.x + target.width / 2 - width / 2, midY = target.y + target.height / 2 - height / 2;
  const spots = [
    clamp(target.x - width - 16, midY), clamp(target.x + target.width + 16, midY),
    clamp(midX, target.y + target.height + 16), clamp(midX, target.y - height - 16),
  ];
  const free = spots.find(([x, y]) => {
    const box = { x, y, width, height };
    return !overlaps(box, target) && !overlaps(box, phone);
  });
  return free ?? spots.find(([x, y]) => !overlaps({ x, y, width, height }, target)) ?? clamp(target.x - width - 16, midY);
}

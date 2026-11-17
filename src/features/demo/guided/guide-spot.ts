type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b?: Box | null) => !!b && b.width > 0 &&
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Prefer the roomier side, then try the other sides to avoid the phone and target.
export function guideSpot(target: Box | undefined, phone: Box | undefined, width: number, height: number,
  view = { width: innerWidth, height: innerHeight }): [number, number] {
  const minY = Math.min(90, Math.max(16, view.height - height - 16));
  const clamp = (x: number, y: number): [number, number] => [
    Math.max(16, Math.min(view.width - width - 16, x)), Math.max(minY, Math.min(view.height - height - 16, y))];
  if (!target) return clamp((view.width - width) / 2, (view.height - height) / 2);
  const midX = target.x + target.width / 2 - width / 2, midY = target.y + target.height / 2 - height / 2;
  const sides = [clamp(target.x - width - 16, midY), clamp(target.x + target.width + 16, midY)];
  if (view.width - target.x - target.width > target.x) sides.reverse();
  const spots = [
    ...sides,
    clamp(midX, target.y + target.height + 16), clamp(midX, target.y - height - 16),
  ];
  const free = spots.find(([x, y]) => {
    const box = { x, y, width, height };
    return !overlaps(box, target) && !overlaps(box, phone);
  });
  return free ?? spots.find(([x, y]) => !overlaps({ x, y, width, height }, target)) ?? clamp(target.x - width - 16, midY);
}

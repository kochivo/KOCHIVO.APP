type Rect = { x: number; y: number; width: number; height: number };
export function insideClips(rect: Rect, clips: Rect[]) {
  return clips.every(clip => rect.x >= clip.x && rect.y >= clip.y && rect.x + rect.width <= clip.x + clip.width && rect.y + rect.height <= clip.y + clip.height);
}
function visibleEndpoint(element: Element | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect(), clips: Rect[] = [];
  let ancestor: Element | null = element;
  while (ancestor) {
    const style = getComputedStyle(ancestor);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    if (ancestor !== element && /(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) clips.push(ancestor.getBoundingClientRect());
    ancestor = ancestor.parentElement;
  }
  return insideClips(rect, clips);
}
export function canPulse(reduced: boolean, from: Rect | null, to: Rect | null, width: number, height: number) {
  const visible = (r: Rect | null) => r && r.width > 0 && r.height > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= height;
  return !reduced && Boolean(visible(from) && visible(to));
}
export function pulse(from: Element | null, to: Element | null) {
  const a = from?.getBoundingClientRect() ?? null, b = to?.getBoundingClientRect() ?? null;
  if (document.hidden || !visibleEndpoint(from) || !visibleEndpoint(to) || !canPulse(matchMedia('(prefers-reduced-motion: reduce)').matches, a, b, innerWidth, innerHeight) || !a || !b) return;
  const x = a.x + a.width / 2, y = a.y + a.height / 2, tx = b.x + b.width / 2, ty = b.y + Math.min(40, b.height / 2);
  const dot = document.createElement('span'), ripple = document.createElement('span');
  dot.className = 'pointer-events-none fixed start-0 top-0 z-50 size-3 rounded-full bg-lime';
  ripple.className = 'pointer-events-none fixed start-0 top-0 z-50 size-5 rounded-full border-2 border-lime';
  document.body.append(dot, ripple);
  // WAAPI uses physical viewport coordinates; RTL start is offset back to the viewport origin.
  const origin = getComputedStyle(dot).direction === 'rtl' ? innerWidth - 12 : 0;
  const ringOrigin = getComputedStyle(ripple).direction === 'rtl' ? innerWidth - 20 : 0;
  const flight = dot.animate([{ transform: `translate(${x - origin}px,${y}px)` },
    { transform: `translate(${(x + tx) / 2 - origin}px,${Math.max(10, Math.min(y, ty) - 80)}px)` },
    { transform: `translate(${tx - origin}px,${ty}px)` }], { duration: 300, easing: 'ease-in-out' });
  const landing = ripple.animate([{ transform: `translate(${tx - ringOrigin}px,${ty}px) scale(.3)`, opacity: 0 },
    { transform: `translate(${tx - ringOrigin}px,${ty}px) scale(2)`, opacity: 1 },
    { transform: `translate(${tx - ringOrigin}px,${ty}px) scale(2.5)`, opacity: 0 }], { duration: 100, delay: 300, fill: 'both' });
  flight.onfinish = () => dot.remove(); landing.onfinish = () => ripple.remove();
  flight.oncancel = () => dot.remove(); landing.oncancel = () => ripple.remove();
}

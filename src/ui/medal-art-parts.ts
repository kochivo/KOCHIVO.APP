const radians = (degrees: number) => degrees * Math.PI / 180;
const polygon = (points: number[][]) => 'M' + points.map(point => point.map(n => n.toFixed(2)).join(' ')).join(' L') + 'Z';

export function star(outer: number, inner: number) {
  return polygon(Array.from({ length: 10 }, (_, i) => {
    const a = radians(-90 + i * 36), radius = i % 2 ? inner : outer;
    return [60 + Math.cos(a) * radius, 62 + Math.sin(a) * radius];
  }));
}

export function hexagon(radius: number) {
  return polygon(Array.from({ length: 6 }, (_, i) => {
    const a = radians(i * 60 - 90);
    return [60 + Math.cos(a) * radius, 62 + Math.sin(a) * radius];
  }));
}

export function rays(radius: number) {
  return Array.from({ length: 20 }, (_, i) => {
    const a = radians(i * 18 - 90), length = radius + 14 + (i % 2 ? 0 : 7);
    return `M60 62 L${60 + Math.cos(a + .07) * length} ${62 + Math.sin(a + .07) * length} L${60 + Math.cos(a - .07) * length} ${62 + Math.sin(a - .07) * length}Z`;
  });
}

export function wings(radius: number) {
  return [1, -1].flatMap(side => [3, 2, 1, 0].map(k => {
    const y = 50 + k * 8, length = 34 - k * 5;
    const x = (offset: number) => 60 + side * (radius + offset);
    return `M${x(-4)} ${y + 6} C${x(length * .5)} ${y - 4}, ${x(length)} ${y - 6 - k * 2}, ${x(length + 6)} ${y - 12 - k * 3} C${x(length * .8)} ${y + 4}, ${x(6)} ${y + 12}, ${x(-4)} ${y + 14}Z`;
  }));
}

export function laurel(radius: number) {
  return [1, -1].flatMap(side => Array.from({ length: 6 }, (_, i) => {
    const degrees = side < 0 ? 102 + i * 17 : 78 - i * 17, a = radians(degrees);
    const cx = 60 + Math.cos(a) * (radius + 5), cy = 62 + Math.sin(a) * (radius + 5);
    return { cx, cy, transform: `rotate(${degrees + side * 30} ${cx} ${cy})` };
  }));
}

export function ticks(radius: number) {
  return Array.from({ length: 48 }, (_, i) => {
    const a = radians(i * 7.5);
    return { x1: 60 + Math.cos(a) * (radius - 1.5), y1: 62 + Math.sin(a) * (radius - 1.5),
      x2: 60 + Math.cos(a) * (radius - 4), y2: 62 + Math.sin(a) * (radius - 4) };
  });
}

export function sparkle(x: number, y: number, size: number) {
  return `M${x} ${y - size} Q${x} ${y} ${x + size} ${y} Q${x} ${y} ${x} ${y + size} Q${x} ${y} ${x - size} ${y} Q${x} ${y} ${x} ${y - size}Z`;
}

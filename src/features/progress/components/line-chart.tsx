import { useId } from 'react';
import type { TrendPoint } from '../trends';

export function LineChart({ points, title, unit }: { points: readonly TrendPoint[]; title: string; unit: string }) {
  const id = useId();
  if (!points.length) return <p className="text-sm text-muted">لسه مفيش قياسات</p>;
  const min = Math.min(...points.map((point) => point.value));
  const range = Math.max(1, Math.max(...points.map((point) => point.value)) - min);
  const coordinates = points.map((point, index) => ({
    x: points.length === 1 ? 175 : 330 - index * 310 / (points.length - 1),
    y: 115 - (point.value - min) / range * 95,
  }));
  return <div>
    <svg viewBox="0 0 350 155" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-summary`} className="w-full text-lime">
      <title id={`${id}-title`}>{title}</title>
      <line x1="15" x2="335" y1="125" y2="125" stroke="currentColor" className="text-line" />
      <polyline points={coordinates.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      {coordinates.map(({ x, y }, index) => <circle key={index} cx={x} cy={y} r="4" fill="currentColor" />)}
      <text x={points.length === 1 ? 175 : 330} y="148" textAnchor="middle" fill="currentColor" className="text-muted text-xs">أ1</text>
      {points.length > 1 && <text x="20" y="148" textAnchor="middle" fill="currentColor" className="text-muted text-xs">أ{points.length}</text>}
    </svg>
    <p id={`${id}-summary`} className="sr-only">{points.map((point) => `${point.date}: ${point.value} ${unit}`).join('، ')}</p>
  </div>;
}

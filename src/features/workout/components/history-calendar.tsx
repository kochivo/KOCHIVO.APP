'use client';
import { useRef, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { localDate, formatDateAr, saturdayWeek, weeklyWeekday } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { ProgramSnapshot } from '@/core/offline';
import { messages } from '../history-v3-messages';

export function calendarCells({ month, today, trained, planned }: {
  month: string; today: string; trained: readonly string[]; planned: readonly string[];
}) {
  const first = `${month}-01`;
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  return Array.from({ length: weeklyWeekday(first) + count }, (_, index) => {
    const day = index - weeklyWeekday(first) + 1;
    if (day < 1) return null;
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const done = trained.includes(date);
    return { date, day, trained: done, today: date === today, missed: !done && date < today && planned.includes(date) };
  });
}

export function plannedDate(date: string, snapshot?: ProgramSnapshot) {
  if (!snapshot?.starts_on || date < snapshot.starts_on) return false;
  if (snapshot.settings.repeatWeekly === false && date >= localDate(new Date(Date.parse(`${snapshot.starts_on}T12:00:00Z`) + 7 * 86400000), 'UTC')) return false;
  const weekly = snapshot.days.some(day => day.weekday != null);
  return weekly ? snapshot.days.some(day => day.weekday === weeklyWeekday(date) && !day.is_rest_day) :
    snapshot.training_days.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

export function HistoryCalendar({ today, trained, snapshot }: { today: string; trained: string[]; snapshot?: ProgramSnapshot }) {
  const t = useT(messages);
  const locale = useLocale();
  const [offset, setOffset] = useState(0);
  const touchStart = useRef<number | null>(null);
  const base = new Date(`${today}T12:00:00Z`);
  base.setUTCDate(1);
  base.setUTCMonth(base.getUTCMonth() + offset);
  const month = localDate(base, 'UTC').slice(0, 7);
  const days = calendarCells({ month, today, trained, planned: [] }).flatMap(cell => cell ? [cell.date] : []);
  const cells = calendarCells({ month, today, trained, planned: days.filter(date => plannedDate(date, snapshot)) }).filter(cell => month !== today.slice(0, 7) || !cell || cell.date <= today);
  const week = saturdayWeek(today);
  const hasSchedule = Boolean(snapshot?.starts_on && (snapshot.days.some(day => day.weekday != null) || snapshot.training_days.length));
  const name = formatDateAr(`${month}-01`, { month: 'long', ...(offset ? { year: 'numeric' } : {}) }, locale);
  const change = (direction: number) => setOffset(value => value + direction * (locale === 'en' ? -1 : 1));
  return <section aria-label={name} tabIndex={0} aria-keyshortcuts="ArrowLeft ArrowRight" onKeyDown={event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); change(event.key === 'ArrowLeft' ? 1 : -1); }
  }} onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => {
    const end = event.changedTouches[0]?.clientX;
    if (end !== undefined && touchStart.current !== null && Math.abs(end - touchStart.current) > 40) change(end < touchStart.current ? 1 : -1);
    touchStart.current = null;
  }} className="flex touch-pan-y flex-col gap-2.5 rounded-[26px] border border-line-soft bg-surface p-3.5 focus-visible:outline-2 focus-visible:outline-ink">
    <div className="flex items-center justify-between gap-2"><b className="text-[15px]">{name}</b><span className="text-xs text-muted">{t('week', { done: formatNumber(week.filter(date => trained.includes(date)).length, locale), planned: hasSchedule ? formatNumber(week.filter(date => plannedDate(date, snapshot)).length, locale) : '—' })}</span></div>
    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-faint">{(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const).map(key => <span key={key}>{t(key)}</span>)}</div>
    <div className="grid grid-cols-7 gap-1 font-display text-[13px] font-bold">{cells.map((cell, index) => cell ? <span key={cell.date} aria-current={cell.today ? 'date' : undefined} aria-label={`${formatDateAr(cell.date, { day: 'numeric', month: 'long' }, locale)}${cell.trained ? ` · ${t('trained')}` : cell.missed ? ` · ${t('missed')}` : ''}`} className={`flex h-10 items-center justify-center rounded-xl ${cell.trained ? 'bg-lime text-on-lime' : cell.missed ? 'border border-sore text-sore' : 'text-faint'} ${cell.today ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}>{formatNumber(cell.day, locale)}</span> : <span key={`blank-${index}`} />)}</div>
    <div className="flex gap-3.5 text-[11px] text-muted">{(['trained', 'missed', 'today'] as const).map(key => <span key={key} className="flex items-center gap-1.5"><span aria-hidden className={`size-2.5 rounded-[3px] ${key === 'trained' ? 'bg-lime' : key === 'missed' ? 'border border-sore' : 'border-2 border-ink'}`} />{t(key)}</span>)}</div>
  </section>;
}

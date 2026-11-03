import { DEFAULT_TIMEZONE, localDate } from '@/lib/dates';

export function Greeting({ firstName, now }: { firstName?: string; now: Date }) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: DEFAULT_TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const date = new Date(`${localDate(now)}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(date);
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(date);
  return <div className="space-y-1">
    <p className="text-start text-xs tracking-widest text-muted"><bdi>{`${weekday} · ${date.getUTCDate()} ${month}`.toUpperCase()}</bdi></p>
    <h1 className="text-2xl font-extrabold">{hour < 12 ? 'صباح الخير' : 'مساء الخير'}{firstName ? ` يا ${firstName}` : ''}</h1>
  </div>;
}
